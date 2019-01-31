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

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/classes/Google.css'

], function (QUI, QDOM, QUIButton, QUIAjax, QUILocale) {
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
        },

        /**
         * Get Login Button
         *
         * @return {Promise}
         */
        getLoginButton: function () {
            var self = this,
                text = this.getAttribute('text');

            if (text === false) {
                text = QUILocale.get(lg, 'classes.google.login.btn.text');
            }

            var LoginBtn = new QUIButton({
                'class'  : 'quiqqer-auth-google-login-btn',
                textimage: 'fa fa-google',
                text     : text,
                events   : {
                    onClick: function (Btn) {
                        Btn.disable();

                        self.login().then(function () {
                            Btn.enable();
                        }, function () {
                            Btn.enable();
                        });
                    }
                }
            });

            return new Promise(function (resolve, reject) {
                this.$load().then(function () {
                    resolve(LoginBtn);
                }, reject);
            }.bind(this));
        },

        /**
         * Get Registration Button
         *
         * @return {Promise}
         */
        getRegistrationButton: function () {
            var self = this;

            var RegistrationBtn = new QUIButton({
                'class'  : 'quiqqer-auth-google-registration-btn',
                textimage: 'fa fa-google',
                text     : QUILocale.get(lg, 'controls.frontend.registrar.registration_button'),
                events   : {
                    onClick: function (Btn) {
                        Btn.disable();

                        self.login().then(function () {
                            Btn.enable();
                        }, function () {
                            Btn.enable();
                        });
                    }
                }
            });

            return new Promise(function (resolve, reject) {
                this.$load().then(function () {
                    resolve(RegistrationBtn);
                }, reject);
            }.bind(this));
        },

        /**
         * Login to Google (must be triggered by user click)
         *
         * @return {Promise}
         */
        login: function () {
            if (this.$loggedIn) {
                return Promise.resolve();
            }

            var self = this;

            return new Promise(function (resolve, reject) {
                GoogleAuth.signIn({
                    prompt: 'select_account'
                }).then(function () {
                    if (!GoogleAuth.isSignedIn.get()) {
                        reject("Google Login failed.");
                        return;
                    }

                    self.$GoogleUser = GoogleAuth.currentUser.get();
                    self.$AuthData   = self.$GoogleUser.getAuthResponse(true);
                    self.$token      = self.$AuthData.id_token;
                    self.$loggedIn   = true;

                    self.fireEvent('login', [self.$AuthData, self]);

                    resolve();
                }, function () {
                    reject("Google Login failed.");
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
         * Get Logout Button
         *
         * @return {Object} - qui/controls/buttons/Button
         */
        getLogoutButton: function () {
            var self = this;

            var LogoutBtn = new QUIButton({
                'class'  : 'quiqqer-auth-google-login-btn',
                disabled : true,
                textimage: 'fa fa-sign-out',
                text     : QUILocale.get(lg, 'classes.google.logout.btn.text'),
                events   : {
                    onClick: function (Btn) {
                        Btn.disable();

                        self.logout().then(function () {
                            Btn.enable();
                        }, function () {
                            Btn.enable();
                        });
                    }
                }
            });

            this.$load().then(function () {
                LogoutBtn.enable();
            });

            return LogoutBtn;
        },

        /**
         * Google logout
         *
         * @return {Promise}
         */
        logout: function () {
            if (!this.$loggedIn) {
                return Promise.resolve();
            }

            var self = this;

            return new Promise(function (resolve, reject) {
                GoogleAuth.signOut().then(function () {
                    self.$GoogleUser = false;
                    self.$AuthData   = false;
                    self.$token      = false;

                    self.fireEvent('logout', [self.$AuthData, self]);
                    self.$loggedIn = false;

                    resolve();
                }, reject);
            });
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
         * Check if user is signed in with QUIQQER
         *
         * @return {Promise}
         */
        isSignedIn: function () {
            var self = this;

            return new Promise(function (resolve, reject) {
                self.$load().then(function () {
                    resolve(GoogleAuth.isSignedIn.get());
                }, reject);
            });
        },

        /**
         * Get info of Google profile
         *
         * @return {Promise}
         */
        getProfileInfo: function () {
            var self = this;

            return this.$load().then(function () {
                return new Promise(function (resolve, reject) {
                    if (!self.$GoogleUser) {
                        reject("Google User is not signed in.");
                        return;
                    }

                    var Profile = self.$GoogleUser.getBasicProfile();

                    resolve({
                        id   : Profile.getId(),
                        name : Profile.getName(),
                        email: Profile.getEmail()
                    });
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
            if (this.$loaded) {
                return Promise.resolve();
            }

            var self = this;

            return new Promise(function (resolve, reject) {
                self.$getClientId().then(function (clientId) {
                    if (!clientId) {
                        QUI.getMessageHandler().then(function (MH) {
                            MH.addAttention(
                                QUILocale.get(lg, 'classes.google.warn.no.clientId')
                            );
                        });

                        return;
                    }

                    if (!self.$scriptsLoaded) {
                        try {
                            new Element('script', {
                                src  : 'https://apis.google.com/js/platform.js',
                                async: 'async',
                                defer: 'defer'
                            }).inject(document.head);

                            self.$scriptsLoaded = true;
                        } catch (e) {
                            reject('Google API initialization failed.');
                        }
                    }

                    if (!self.$waitForApi) {
                        var waitForGoogleApi = setInterval(function () {
                            if (typeof gapi === 'undefined') {
                                return;
                            }

                            clearInterval(waitForGoogleApi);

                            // initiale Google API
                            window.gapi.load('auth2', function () {
                                var GoogleAuthInstance = window.gapi.auth2.init({
                                    client_id: clientId
                                });

                                GoogleAuthInstance.then(function () {
                                    GoogleAuth   = GoogleAuthInstance;
                                    self.$loaded = true;

                                    self.isSignedIn().then(function (isSignedIn) {
                                        if (!isSignedIn) {
                                            resolve();
                                            return;
                                        }

                                        self.$GoogleUser = GoogleAuth.currentUser.get();
                                        self.$AuthData   = self.$GoogleUser.getAuthResponse(true);
                                        self.$token      = self.$AuthData.id_token;

                                        self.$loggedIn = true;
                                        self.fireEvent('login', [self.$AuthData, self]);

                                        resolve();
                                    });
                                }, reject);
                            });
                        }, 200);

                        self.$waitForApi = true;
                    } else {
                        var waitForGoogleLoad = setInterval(function () {
                            if (!self.$loaded) {
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
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_authgoogle_ajax_getClientId', resolve, {
                    'package': 'quiqqer/authgoogle',
                    onError  : reject
                });
            });
        }
    });
});