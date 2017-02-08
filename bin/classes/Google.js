/**
 * Main controller for Google JavaScript API
 *
 * @module package/quiqqer/authgoogle/bin/classes/Google
 * @author www.pcsg.de (Patrick Müller)
 *
 * @require qui/classes/DOM
 * @require qui/controls/buttons/Button
 * @requrie Ajax
 * @require Locale
 * @require css!package/quiqqer/authgoogle/bin/classes/Google.css
 *
 * @event onLoaded [this] - Fires if everything has loaded
 * @event onLogin [authResponse, this] - Fires if the user successfully authenticates with Google
 * @event onLogout [this] - Fires if the user clicks the Logout button
 */
define('package/quiqqer/authgoogle/bin/classes/Google', [

    'qui/classes/DOM',
    'qui/controls/buttons/Button',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/classes/Google.css'

], function (QDOM, QUIButton, QUIAjax, QUILocale) {
    "use strict";

    var lg         = 'quiqqer/authgoogle';
    var GoogleAuth = null;

    return new Class({

        Extends: QDOM,
        Type   : 'package/quiqqer/authgoogle/bin/classes/Google',

        Binds: [
            'getLoginButton'
        ],

        options: {},

        initialize: function (options) {
            this.parent(options);
            this.$authData   = false;
            this.$loaded     = false;
            this.$GoogleUser = false; // currently logged in Google user
        },

        /**
         * Get Login Button
         *
         * @return {Object} - qui/controls/buttons/Button
         */
        getLoginButton: function () {
            var self = this;

            var LoginBtn = new QUIButton({
                'class'  : 'quiqqer-auth-google-login-btn',
                disabled : true,
                textimage: 'fa fa-google',
                text     : QUILocale.get(lg, 'classes.google.login.btn.text'),
                events   : {
                    onClick: function () {
                        GoogleAuth.signIn().then(function (result) {
                            if (!GoogleAuth.isSignedIn.get()) {
                                return;
                            }

                            self.$GoogleUser = GoogleAuth.currentUser.get();
                            self.$authData   = self.$GoogleUser.getAuthResponse(true);

                            self.fireEvent('login', [self.$authData, self]);
                        }, function (Exception) {
                            // nothing, user probably denied access to google account
                        });
                    }
                }
            });

            this.$load().then(function () {
                LoginBtn.enable();
            });

            return LoginBtn;
        },

        /**
         * Get Logout Button
         *
         * @param {bool} [rerequest] - Re-request facebook permissions
         * @return {Object} - qui/controls/buttons/Button
         */
        getAuthButton: function (rerequest) {
            var self = this;

            var AuthBtn = new QUIButton({
                'class'  : 'quiqqer-auth-google-login-btn',
                disabled : true,
                textimage: 'fa fa-google',
                text     : QUILocale.get(lg, 'classes.google.login.btn.authorize.text'),
                events   : {
                    onClick: function () {
                        var Options = {
                            scope: 'public_profile,email'
                        };

                        if (rerequest) {
                            Options.auth_type = 'rerequest';
                        }

                        FB.login(function (response) {
                            self.$authData = response.authResponse;

                            if (response.authResponse) {
                                self.fireEvent('login', [response.authResponse, self]);
                            }
                        }, Options);
                    }
                }
            });

            this.$load().then(function () {
                AuthBtn.enable();
            });

            return AuthBtn;
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

                        FB.logout(function (response) {
                            self.$authData = null;
                            self.fireEvent('logout', [self]);
                            Btn.enable();
                        }, {
                            accessToken: self.$authData.accessToken
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
         * Get auth data of currently connected Google account
         *
         * @return {Promise}
         */
        getAuthData: function () {
            var self = this;

            return this.$load().then(function () {
                return self.$authData
            });
        },

        /**
         * Check if user is signed in with QUIQQER
         *
         * @return {Promise}
         */
        isSignedIn: function () {
            return this.$load().then(function () {
                return Promise.resolve(GoogleAuth.isSignedIn.get());
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
         * Connect a facebook account with a quiqqer account
         *
         * @param {number} userId - QUIQQER User ID
         * @param {string} gToken - Google id_token
         * @return {Promise}
         */
        connectQuiqqerAccount: function (userId, gToken) {
            return new Promise(function (resolve, reject) {
                QUIAjax.post(
                    'package_quiqqer_authgoogle_ajax_connectAccount',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        userId   : userId,
                        gToken   : gToken,
                        onError  : reject
                    }
                )
            });
        },

        /**
         * Connect a facebook account with a quiqqer account
         *
         * @param {number} userId - QUIQQER User ID
         * @return {Promise}
         */
        disconnectQuiqqerAccount: function (userId) {
            return new Promise(function (resolve, reject) {
                QUIAjax.post(
                    'package_quiqqer_authgoogle_ajax_disconnectAccount',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        userId   : userId,
                        onError  : reject
                    }
                )
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
                QUIAjax.get(
                    'package_quiqqer_authgoogle_ajax_getAccountByQuiqqerUserId',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        userId   : userId,
                        onError  : reject
                    }
                );
            });
        },

        /**
         * Check if Google account is connected to a QUIQQER account
         *
         * @param {number} fbUserId
         * @return {Promise}
         */
        isAccountConnectedToQuiqqer: function (fbUserId) {
            return new Promise(function (resolve, reject) {
                QUIAjax.get(
                    'package_quiqqer_authgoogle_ajax_isFacebookAccountConnected',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        fbUserId : fbUserId,
                        onError  : reject
                    }
                );
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
                            )
                        });

                        return;
                    }

                    new Element('script', {
                        src  : 'https://apis.google.com/js/platform.js',
                        async: 'async',
                        defer: 'defer'
                    }).inject(document.head);

                    var waitForGoogleApi = setInterval(function () {
                        if (typeof gapi === 'undefined') {
                            return;
                        }

                        clearInterval(waitForGoogleApi);

                        // initiale Google API
                        gapi.load('auth2', function () {
                            var GoogleAuthInstance = gapi.auth2.init({
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
                                    self.$authData   = self.$GoogleUser.getAuthResponse(true);

                                    resolve();
                                });
                            });
                        });

                    }, 200);
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
                QUIAjax.get(
                    'package_quiqqer_authgoogle_ajax_getClientId',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        onError  : reject
                    }
                )
            });
        }
    });
});