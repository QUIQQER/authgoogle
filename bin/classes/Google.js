/**
 * Main controller for Google JavaScript API
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

    return new Class({

        Extends: QDOM,
        Type: 'package/quiqqer/authgoogle/bin/classes/Google',

        Binds: ['login', 'logout'],

        options: {
            text: null
        },

        initialize: function (options) {
            this.parent(options);

            this.$loaded = false;
            this.$token = false;
            this.$clientId = null;
            this.$gisInitialized = false;
        },

        isOneTapSupported: function () {
            if (typeof window.google === 'undefined') {
                return false;
            }

            if (typeof window.google.accounts === 'undefined') {
                return false;
            }

            return typeof window.google.accounts.id !== 'undefined';
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
                            let Login = null;
                            const loginNode = Btn.getElm().getParent('[data-qui="controls/users/Login"]');

                            if (loginNode) {
                                Login = QUI.Controls.getById(loginNode.get('data-quiid'));
                            }

                            // test if user already exists
                            // and we are in a login process
                            if (isConnected && Login) {
                                form.setAttribute('data-authenticator', 'QUI\\Auth\\Google\\Auth');
                                return Login.auth(form);
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

                const oneTapSupported = this.isOneTapSupported();

                try {
                    if (oneTapSupported && !this.$token) {
                        await this.initializeGoogleOneTap();
                    }
                } catch (e) {
                }

                if (!this.$token) {
                    return new Promise((resolve, reject) => {
                        const redirectUri = window.location.origin + URL_OPT_DIR + 'quiqqer/authgoogle/bin/oauth_callback.php';
                        const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
                        const state = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
                        const nonce = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
                        let settled = false;

                        const finish = (handler, value) => {
                            if (settled) {
                                return;
                            }

                            settled = true;
                            window.removeEventListener('message', messageListener);
                            clearInterval(popupChecker);
                            clearTimeout(popupTimeout);
                            handler(value);
                        };

                        authorizeUrl.search = new URLSearchParams({
                            client_id: this.$clientId,
                            redirect_uri: redirectUri,
                            response_type: 'id_token',
                            scope: 'openid email profile',
                            response_mode: 'fragment',
                            prompt: 'select_account',
                            state: state,
                            nonce: nonce
                        }).toString();

                        const popup = window.open(
                            authorizeUrl.toString(),
                            'google_oauth',
                            'width=500,height=600'
                        );

                        if (!popup) {
                            reject(new Error('Google login popup could not be opened.'));
                            return;
                        }

                        // Listen for the message event
                        const messageListener = (event) => {
                            if (event.origin !== window.location.origin) {
                                return;
                            }

                            if (!event.data || event.data.googleState !== state) {
                                return;
                            }

                            if (event.data.googleIdToken) {
                                this.$token = event.data.googleIdToken;
                                popup.close();
                                finish(resolve, this.$token);
                            }
                        };
                        window.addEventListener('message', messageListener);

                        const popupChecker = window.setInterval(() => {
                            if (settled) {
                                clearInterval(popupChecker);
                            }
                        }, 500);

                        const popupTimeout = window.setTimeout(() => {
                            finish(reject, new Error('Google login popup timed out.'));
                        }, 120000);
                    });
                }

                return this.$token;
            });
        },

        initializeGoogleIdentity: function () {
            if (this.$gisInitialized) {
                return;
            }

            window.google.accounts.id.initialize({
                client_id: this.$clientId,
                context: 'signin',
                nonce: crypto.randomUUID?.() || Math.random().toString(36).substring(2),
                auto_select: false,
                cancel_on_tap_outside: true,
                itp_support: true,
                use_fedcm_for_prompt: true,
                callback: (response) => {
                    if (response && typeof response.credential === 'string' && response.credential !== '') {
                        this.$token = response.credential;
                    }
                }
            });

            this.$gisInitialized = true;
        },

        initializeGoogleOneTap: async function () {
            if (!this.isOneTapSupported()) {
                return Promise.reject('Not supported');
            }

            return new Promise((resolve, reject) => {
                try {
                    this.initializeGoogleIdentity();

                    let settled = false;
                    const finish = (handler, value) => {
                        if (settled) {
                            return;
                        }

                        settled = true;
                        handler(value);
                    };

                    const tokenWatcher = window.setInterval(() => {
                        if (!this.$token) {
                            return;
                        }

                        clearInterval(tokenWatcher);
                        finish(resolve);
                    }, 150);

                    window.google.accounts.id.prompt((notification) => {
                        if (this.$token) {
                            clearInterval(tokenWatcher);
                            finish(resolve);
                            return;
                        }

                        // These helpers are unavailable or limited when FedCM controls the prompt.
                        if (notification && typeof notification.isNotDisplayed === 'function' && notification.isNotDisplayed()) {
                            clearInterval(tokenWatcher);
                            finish(reject, 'One Tap was not displayed');
                            return;
                        }

                        if (notification && typeof notification.isSkippedMoment === 'function' && notification.isSkippedMoment()) {
                            clearInterval(tokenWatcher);
                            finish(reject, 'User skipped the One Tap dialog');
                            return;
                        }

                        if (notification && typeof notification.isDismissedMoment === 'function' && notification.isDismissedMoment()) {
                            clearInterval(tokenWatcher);
                            finish(reject, 'User dismissed the One Tap dialog');
                        }
                    });

                    window.setTimeout(() => {
                        clearInterval(tokenWatcher);

                        if (!this.$token) {
                            finish(reject, 'One Tap timed out');
                        } else {
                            finish(resolve);
                        }
                    }, 10000);
                } catch (e) {
                    reject('Fehler bei One Tap');
                }
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
                    'package': 'quiqqer/authgoogle',
                    idToken: token,
                    onError: reject
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
                    'package': 'quiqqer/authgoogle',
                    userId: userId,
                    idToken: idToken,
                    onError: reject
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
                    'package': 'quiqqer/authgoogle',
                    userId: userId,
                    onError: reject
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
                    'package': 'quiqqer/authgoogle',
                    userId: userId,
                    onError: reject
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
                    'package': 'quiqqer/authgoogle',
                    idToken: idToken,
                    onError: reject
                });
            });
        }
    });
});
