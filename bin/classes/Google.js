/**
 * Main controller for Google JavaScript API
 *
 * @module package/quiqqer/authgoogle/bin/classes/Google
 *
 * @event onLoaded [this] - Fires if everything has loaded
 * @event onLogin [authResponse, this] - Fires if the user successfully authenticates with Google
 * @event onLogout [this] - Fires if the user clicks the Logout button
 */
define('package/quiqqer/authgoogle/bin/classes/Google', [

    'qui/QUI',
    'qui/classes/DOM',
    'qui/controls/buttons/Button',
    'qui/controls/windows/Confirm',
    'package/quiqqer/frontend-users/bin/Registration',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/classes/Google.css'

], function (QUI, QDOM, QUIButton, QUIConfirm, registration, QUIAjax, QUILocale) {
    "use strict";

    const lg = 'quiqqer/authgoogle';

    let isFedCMAuthenticating = false;
    let setHasAttemptedAutoLogin = false;


    return new Class({

        Extends: QDOM, Type: 'package/quiqqer/authgoogle/bin/classes/Google',

        Binds: ['login', 'logout'],

        options: {
            text: null
        },

        initialize: function (options) {
            this.parent(options);

            this.$loaded = false;
            this.$token = false;
            this.$clientId = null;
        },

        isFedCMSupported: function () {
            try {
                return (typeof window !== 'undefined' && 'IdentityCredential' in window && 'navigator' in window && 'credentials' in navigator && !!navigator.credentials.get);
            } catch {
                return false;
            }
        },

        isOneTapSupported: function () {
            if (typeof window.google === 'undefined') {
                return false;
            }

            if (typeof window.google.accounts === 'undefined') {
                return false;
            }

            return typeof window.google.accounts.id === 'undefined';
        },

        loadGoogleScript: function () {
            return new Promise((resolve, reject) => {
                const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
                if (existing) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            }).then(() => {
                this.$loaded = true;
            });
        },

        /**
         * Get Client-ID for Google API requests
         *
         * @return {Promise}
         */
        getClientId: function () {
            if (this.$clientId) {
                return Promise.resolve(this.$clientId);
            }

            return new Promise((resolve, reject) => {
                QUIAjax.get('package_quiqqer_authgoogle_ajax_getClientId', (clientId) => {
                    this.$clientId = clientId;
                    resolve(clientId);
                }, {
                    'package': 'quiqqer/authgoogle',
                    onError: reject
                });
            });
        },

        /**
         * Are all google auth scripts loaded?
         *
         * @return {Boolean}
         */
        isLoaded: function () {
            return this.$loaded;
        },

        /**
         * Get Login AND Registration Button.
         * Button do both
         *
         * @return {Promise}
         */
        getButton: function () {
            return new QUIButton({
                'class': 'quiqqer-auth-google-registration-btn quiqqer-frontend-social-button',
                textimage: 'fa fa-google',
                text: QUILocale.get(lg, 'controls.frontend.registrar.registration_button'),
                events: {
                    onClick: (Btn) => {
                        Btn.disable();
                        Btn.setAttribute('textimage', 'fa fa-spinner fa-spin');

                        // set token to form
                        const form = Btn.getElm().getParent('form');

                        // start process
                        this.authenticate().then(() => {
                            if (form) {
                                let token = form.querySelector('input[name="token"]');

                                if (token) {
                                    token.parentNode.removeChild(token);
                                }

                                token = document.createElement('input');
                                token.type = 'hidden';
                                token.name = 'token';
                                token.value = this.$token;
                                form.appendChild(token);
                            }

                            return this.isAccountConnectedToQuiqqer(this.$token);
                        }).then((isConnected) => {
                            let Registration = null;
                            let Login = null;

                            const registrationNode = Btn.getElm().getParent('[data-qui="package/quiqqer/frontend-users/bin/frontend/controls/Registration"]');

                            if (registrationNode) {
                                Registration = QUI.Controls.getById(registrationNode.get('data-quiid'));
                            }

                            const loginNode = Btn.getElm().getParent('[data-qui="controls/users/Login"]');

                            if (loginNode) {
                                Login = QUI.Controls.getById(loginNode.get('data-quiid'));
                            }


                            // test if user already exists
                            // if yes: login
                            if (isConnected) {
                                form.setAttribute('data-authenticator', 'QUI\\Auth\\Google\\Auth');

                                return new Promise((resolve) => {
                                    require(['package/quiqqer/frontend-users/bin/frontend/controls/login/Login'], (login) => {
                                        new login({
                                            onSuccess: () => {
                                                console.log('login was successfully');

                                                if (Registration) {
                                                    Registration.fireEvent('register', [Registration]);
                                                    QUI.fireEvent('quiqqerFrontendUsersRegisterSuccess', [Registration]);
                                                    return true;
                                                }

                                                if (Login) {
                                                    Login.auth(form);
                                                    resolve();
                                                    return true;
                                                }

                                                resolve();
                                                return false;
                                            }
                                        }).$authBySocial(form);
                                    });
                                });
                            }

                            // if not: registration
                            if (Registration) {
                                return Registration.$sendForm(form);
                            }

                            return registration.register(
                                'QUI\\Registration\\Google\\Registrar',
                                {token: this.$token}
                            );
                        }).then(() => {
                            Btn.enable();
                            Btn.setAttribute('textimage', 'fa fa-google');
                        }).catch(() => {
                            Btn.enable();
                            Btn.setAttribute('textimage', 'fa fa-google');
                        });
                    }
                }
            });
        },

        /**
         * Start authentication process.
         *
         * @return {Promise} - Return idToken from Google
         */
        authenticate: function () {
            return Promise.all([
                this.loadGoogleScript(),
                this.getClientId()
            ]).then(async () => {
                // no need to authenticate
                // no double authentication
                if (this.$token) {
                    return;
                }

                const fedCMSupported = this.isFedCMSupported();
                const oneTapSupported = this.isOneTapSupported();

                //console.log({fedCMSupported: fedCMSupported});
                //console.log({oneTapSupported: oneTapSupported});

                try {
                    if (fedCMSupported) {
                        await this.authenticateWithFedCM();
                    }

                    if (oneTapSupported && !this.$token) {
                        await this.initializeGoogleOneTap();
                    }
                } catch (e) {
                }

                if (!this.$token) {
                    return new Promise((resolve, reject) => {
                        const redirectUri = window.location.origin + URL_OPT_DIR + 'quiqqer/authgoogle/bin/oauth_callback.php';

                        const popup = window.open(`https://accounts.google.com/o/oauth2/auth?client_id=${this.$clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token id_token&scope=email profile&prompt=consent`, 'google_oauth', 'width=500,height=600');

                        // Listen for the message event
                        const messageListener = (event) => {
                            if (event.origin === window.location.origin && (event.data.googleToken || event.data.googleIdToken)) {
                                this.$token = event.data.googleIdToken;
                                popup.close();
                                window.removeEventListener('message', messageListener);
                                clearInterval(popupChecker);
                                resolve(this.$token);
                            }
                        };
                        window.addEventListener('message', messageListener);

                        // Polling to check if popup was closed
                        const popupChecker = setInterval(() => {
                            if (popup.closed) {
                                window.removeEventListener('message', messageListener);
                                clearInterval(popupChecker);
                                reject(new Error('Popup geschlossen, ohne Login.'));
                            }
                        }, 500);
                    });
                }

                return this.$token;
            });
        },

        authenticateWithFedCM: async function () {
            if (isFedCMAuthenticating) {
                return;
            }

            isFedCMAuthenticating = true;

            try {
                const nonce = crypto.randomUUID?.() || Math.random().toString(36).substring(2);

                const credential = await navigator.credentials.get({
                    identity: {
                        context: 'signin', providers: [{
                            configURL: 'https://accounts.google.com/gsi/fedcm.json',
                            clientId: this.$clientId,
                            mode: 'passive',
                            params: {nonce},
                        }],
                    },
                });

                if (typeof credential.token !== 'undefined') {
                    this.$token = credential.token;
                } else {
                    console.error('Failed to retrieve FedCM credential - possibly disabled in browser');
                    isFedCMAuthenticating = false;
                }
            } catch (err) {
                console.error(err);
            } finally {
                isFedCMAuthenticating = false;
                setHasAttemptedAutoLogin = true;
            }
        },

        initializeGoogleOneTap: async function () {
            if (!this.isOneTapSupported()) {
                return Promise.reject('Not supported');
            }

            return new Promise((resolve, reject) => {
                try {
                    window.google.accounts.id.initialize({
                        client_id: this.$clientId, callback: (response) => {
                            this.$token = response.credential;

                            resolve();
                        }, auto_select: true, cancel_on_tap_outside: false,
                    });

                    window.google.accounts.id.prompt((notification) => {
                        console.log('🔍 One Tap status:', notification);

                        if (notification.isNotDisplayed()) {
                            console.warn('🚫 One Tap was not displayed:', notification.getNotDisplayedReason?.());
                            reject('One Tap was not displayed: ' + notification.getNotDisplayedReason?.());
                        } else if (notification.isSkippedMoment()) {
                            console.warn('⏭ User skipped the One Tap dialog');
                            reject('User skipped the One Tap dialog');
                        } else if (notification.isDismissedMoment()) {
                            console.warn('🙅‍♂️ User dismissed the One Tap dialog');
                            reject('User dismissed the One Tap dialog');
                        } else {
                            console.log('✅ One Tap is displayed');
                            // Do not resolve() here – wait for actual login callback
                        }
                    });

                    setHasAttemptedAutoLogin = true;
                } catch (e) {
                    setHasAttemptedAutoLogin = true;
                    reject('Fehler bei One Tap');
                }
            });
        },

        /**
         * Is the user already logged in, in google
         *
         * @return {boolean}
         */
        isLoggedIn: function () {
            return this.$loggedIn;
        },

        /**
         * Get auth data of currently connected Google account
         *
         * @return {Promise}
         */
        getAuthData: function () {
            return new Promise((resolve, reject) => {
                this.loadGoogleScript().then(() => {
                    resolve(this.$AuthData);
                }, reject);
            });
        },

        /**
         * Get Google id_token for currently connected Google account
         *
         * @return {Promise}
         */
        getToken: function () {
            if (this.$token) {
                return Promise.resolve(this.$token);
            }

            return this.authenticate();
        },

        /**
         * Get info of Google profile
         *
         * @return {Promise}
         */
        getProfileInfo: function (token) {
            return new Promise((resolve, reject) => {
                QUIAjax.post('package_quiqqer_authgoogle_ajax_getDataByToken', resolve, {
                    'package': 'quiqqer/authgoogle', idToken: token, onError: reject
                });
            });
        },

        /**
         * Connect a Google account with a quiqqer account
         *
         * @param {number} userId - QUIQQER User ID
         * @param {string} idToken - Google id_token
         * @return {Promise}
         */
        connectQuiqqerAccount: function (userId, idToken) {
            return new Promise(function (resolve, reject) {
                QUIAjax.post('package_quiqqer_authgoogle_ajax_connectAccount', resolve, {
                    'package': 'quiqqer/authgoogle', userId: userId, idToken: idToken, onError: reject
                });
            });
        },

        /**
         * Connect a Google account with a quiqqer account
         *
         * @param {number} userId - QUIQQER User ID
         * @return {Promise}
         */
        disconnectQuiqqerAccount: function (userId) {
            return new Promise(function (resolve, reject) {
                QUIAjax.post('package_quiqqer_authgoogle_ajax_disconnectAccount', resolve, {
                    'package': 'quiqqer/authgoogle', userId: userId, onError: reject
                });
            });
        },

        /**
         * Get details of connected Google account based on QUIQQER User ID
         *
         * @param {number} userId - QUIQQER User ID
         * @return {Promise}
         */
        getAccountByQuiqqerUserId: function (userId) {
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_authgoogle_ajax_getAccountByQuiqqerUserId', resolve, {
                    'package': 'quiqqer/authgoogle', userId: userId, onError: reject
                });
            });
        },

        /**
         * Check if Google account is connected to a QUIQQER account
         *
         * @param {string} idToken - Google API id_token
         * @return {Promise}
         */
        isAccountConnectedToQuiqqer: function (idToken) {
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_authgoogle_ajax_isGoogleAccountConnected', resolve, {
                    'package': 'quiqqer/authgoogle', idToken: idToken, onError: reject
                });
            });
        }
    });
});
