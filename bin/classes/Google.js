/**
 * Main controller for Google JavaScript API
 *
 * @module package/quiqqer/authgoogle/bin/classes/Google
 * @author www.pcsg.de (Patrick Müller)
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

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/classes/Google.css'

], function (QUI, QDOM, QUIButton, QUIConfirm, QUIAjax, QUILocale) {
    "use strict";

    var lg         = 'quiqqer/authgoogle';
    var GoogleAuth = null;

    return new Class({

        Extends: QDOM,
        Type   : 'package/quiqqer/authgoogle/bin/classes/Google',

        Binds: [
            'login',
            'logout'
        ],

        options: {
            text: null
        },

        initialize: function (options) {
            this.parent(options);
            this.$AuthData      = false;
            this.$token         = false;   // id_token of currently logged in user
            this.$loaded        = false;
            this.$loggedIn      = false;
            this.$GoogleUser    = false; // currently logged in Google user
            this.$scriptsLoaded = false;
            this.$waitForApi    = false;
            this.$initFailed    = false;

            this.$clientId = null;
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
         * Get Registration Button
         *
         * @return {Promise}
         */
        getRegistrationButton: function () {
            const RegistrationBtn = new QUIButton({
                'class'  : 'quiqqer-auth-google-registration-btn',
                textimage: 'fa fa-google',
                text     : QUILocale.get(lg, 'controls.frontend.registrar.registration_button')
            });

            return new Promise(function (resolve, reject) {
                this.$load().then(function () {
                    resolve(RegistrationBtn);
                }, reject);
            }.bind(this));
        },

        /**
         * Start authentication process.
         *
         * @return {Promise<String>} - Return idToken from Google
         */
        authenticate: function () {
            return this.$load().then(() => {
                return this.$getClientId();
            }).then((clientId) => {
                return new Promise((resolve, reject) => {
                    let GoogleAuthInfoPopup;

                    // initiale Google API
                    google.accounts.id.initialize({
                        client_id: clientId,
                        //auto_select          : true,
                        prompt_parent_id     : 'google-auth',
                        cancel_on_tap_outside: false,
                        callback             : (CallbackResponse) => {
                            GoogleAuthInfoPopup.close();
                            resolve(CallbackResponse.credential);
                        }
                    });

                    GoogleAuthInfoPopup = new QUIConfirm({
                        maxHeight: 500,
                        maxWidth : 500,

                        autoclose         : false,
                        backgroundClosable: false,

                        title   : QUILocale.get(lg, 'classes.Google.auth.popup.title'),
                        texticon: 'fa fa-google',
                        icon    : 'fa fa-google',

                        cancel_button: false,
                        ok_button    : false,
                        events       : {
                            onOpen : (Win) => {
                                const Content = Win.getContent();

                                Content.set('html', '<div id="google-auth"></div>');

                                Content.setStyles({
                                    'alignItems'    : 'center',
                                    'display'       : 'flex',
                                    'flexDirection' : 'column',
                                    'justifyContent': 'center'
                                });

                                Win.Loader.show();

                                let authFailed = false;

                                google.accounts.id.prompt((notification) => {
                                    if ("l" in notification) {
                                        switch (notification.l) {
                                            // If "One Tap" has previously been clicked away by the user ->
                                            // Show Google button instead
                                            case 'suppressed_by_user':
                                                google.accounts.id.renderButton(Content, {theme: "filled_blue"});
                                                break;

                                            case 'opt_out_or_no_session':
                                                Content.set(
                                                    'html',
                                                    QUILocale.get(lg, 'classes.Google.auth.error.opt_out_or_no_session')
                                                );

                                                authFailed = true;
                                                break;

                                            case 'browser_not_supported':
                                                Content.set(
                                                    'html',
                                                    QUILocale.get(lg, 'classes.Google.auth.error.browser_not_supported')
                                                );

                                                authFailed = true;
                                                break;

                                            case 'secure_http_required':
                                            case 'missing_client_id':
                                            case 'invalid_client':
                                            case 'unregistered_origin':
                                            case 'unknown_reason':
                                                Content.set(
                                                    'html',
                                                    QUILocale.get(lg, 'classes.Google.auth.error.unknown_reason')
                                                );

                                                authFailed = true;
                                                break;
                                        }
                                    }

                                    if ("m" in notification) {
                                        switch (notification.m) {
                                            case 'user_cancel':
                                                Win.close();
                                                break;
                                        }
                                    }

                                    Win.Loader.hide();

                                    if (authFailed) {
                                        reject();
                                    }
                                });
                            },
                            onClose: () => {
                                resolve(false);
                            }
                        }
                    });

                    GoogleAuthInfoPopup.open();
                });
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
            var self = this;

            return new Promise(function (resolve, reject) {
                self.$load().then(function () {
                    resolve(self.$AuthData);
                }, reject);
            });
        },

        /**
         * Get Google id_token for currently connected Google account
         *
         * @return {Promise}
         */
        getToken: function () {
            var self = this;

            return new Promise(function (resolve, reject) {
                self.$load().then(function () {
                    resolve(self.$token);
                }, reject);
            });
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
                    idToken  : token,
                    onError  : reject
                });
            });
        },

        /**
         * Connect a google account with a quiqqer account
         *
         * @param {number} userId - QUIQQER User ID
         * @param {string} idToken - Google id_token
         * @return {Promise}
         */
        connectQuiqqerAccount: function (userId, idToken) {
            return new Promise(function (resolve, reject) {
                QUIAjax.post('package_quiqqer_authgoogle_ajax_connectAccount', resolve, {
                    'package': 'quiqqer/authgoogle',
                    userId   : userId,
                    idToken  : idToken,
                    onError  : reject
                });
            });
        },

        /**
         * Connect a google account with a quiqqer account
         *
         * @param {number} userId - QUIQQER User ID
         * @return {Promise}
         */
        disconnectQuiqqerAccount: function (userId) {
            return new Promise(function (resolve, reject) {
                QUIAjax.post('package_quiqqer_authgoogle_ajax_disconnectAccount', resolve, {
                    'package': 'quiqqer/authgoogle',
                    userId   : userId,
                    onError  : reject
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
                    userId   : userId,
                    onError  : reject
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
                    idToken  : idToken,
                    onError  : reject
                });
            });
        },

        /**
         * Load Google JavaScript SDK
         *
         * @return {Promise}
         */
        $load: function () {
            if (this.$initFailed) {
                return Promise.reject('Google API initialization failed.');
            }

            if (this.$loaded) {
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                this.$getClientId().then((clientId) => {
                    if (!clientId) {
                        QUI.getMessageHandler().then((MH) => {
                            MH.addAttention(
                                QUILocale.get(lg, 'classes.google.warn.no.clientId')
                            );
                        });

                        return;
                    }

                    if (!this.$scriptsLoaded) {
                        try {
                            new Element('script', {
                                src  : 'https://accounts.google.com/gsi/client',
                                async: 'async',
                                defer: 'defer'
                            }).inject(document.head);

                            this.$scriptsLoaded = true;
                        } catch (e) {
                            reject('Google API initialization failed.');
                            return;
                        }
                    }

                    if (!this.$waitForApi) {
                        const waitForGoogleApi = setInterval(() => {
                            if (typeof google === 'undefined') {
                                return;
                            }

                            clearInterval(waitForGoogleApi);
                            this.$loaded = true;

                            resolve();
                        }, 200);

                        this.$waitForApi = true;
                    } else {
                        const waitForGoogleLoad = setInterval(() => {
                            if (!this.$loaded) {
                                return;
                            }

                            clearInterval(waitForGoogleLoad);
                            resolve();
                        }, 200);
                    }
                });
            });
        },

        /**
         * Get Client-ID for Google API requests
         *
         * @return {Promise}
         */
        $getClientId: function () {
            if (this.$clientId) {
                return Promise.resolve(this.$clientId);
            }

            return new Promise((resolve, reject) => {
                QUIAjax.get('package_quiqqer_authgoogle_ajax_getClientId', (clientId) => {
                    this.$clientId = clientId;
                    resolve(clientId);
                }, {
                    'package': 'quiqqer/authgoogle',
                    onError  : reject
                });
            });
        }
    });
});
