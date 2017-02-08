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

    var lg = 'quiqqer/authgoogle';

    return new Class({

        Extends: QDOM,
        Type   : 'package/quiqqer/authgoogle/bin/classes/Google',

        Binds: [
            'getLoginButton'
        ],

        options: {},

        initialize: function (options) {
            this.parent(options);
            this.$authData = false;
            this.$loaded   = false;
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
                textimage: 'fa fa-google-plus',
                text     : QUILocale.get(lg, 'classes.facebook.login.btn.text'),
                events   : {
                    onClick: function () {
                        FB.login(function (response) {
                            self.$authData = response.authResponse;

                            if (response.authResponse) {
                                self.fireEvent('login', [response.authResponse, self]);
                            }
                        }, {
                            scope: 'public_profile,email'
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
                textimage: 'fa fa-google-plus',
                text     : QUILocale.get(lg, 'classes.facebook.login.btn.authorize.text'),
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
                text     : QUILocale.get(lg, 'classes.facebook.logout.btn.text'),
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
         * Return current login status
         *
         * @return {Promise}
         */
        getStatus: function () {
            return this.$load().then(function () {
                return new Promise(function (resolve, reject) {
                    FB.getLoginStatus(function (response) {
                        resolve(response.status);
                    });
                });
            });
        },

        /**
         * Get info of Google profile
         *
         * @return {Promise}
         */
        getProfileInfo: function () {
            return this.$load().then(function () {
                return new Promise(function (resolve, reject) {
                    FB.api(
                        '/me', {
                            fields: 'first_name,last_name,email'
                        }, function (response) {
                            resolve(response);
                        }
                    );
                });
            });
        },

        /**
         * Connect a facebook account with a quiqqer account
         *
         * @param {number} userId - QUIQQER User ID
         * @param {string} fbToken - FB Api access token
         * @return {Promise}
         */
        connectQuiqqerAccount: function (userId, fbToken) {
            return new Promise(function (resolve, reject) {
                QUIAjax.post(
                    'package_quiqqer_authgoogle_ajax_connectAccount',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        userId   : userId,
                        fbToken  : fbToken,
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
                self.$getAppId().then(function (appId) {
                    if (!appId) {
                        QUI.getMessageHandler().then(function (MH) {
                            MH.addAttention(
                                QUILocale.get(lg, 'classes.facebook.warn.no.appId')
                            )
                        });

                        return;
                    }

                    // Initialize Google JavaScript SDK
                    window.fbAsyncInit = function () {
                        try {
                            FB.init({
                                appId  : appId,
                                status : true,
                                version: 'v2.8' // @todo put in config
                            });
                        } catch (Exception) {
                            console.log(Exception);
                        }

                        FB.getLoginStatus(function (response) {
                            self.$loaded = true;

                            if (response.authResponse) {
                                self.$authData = response.authResponse;
                            }

                            self.fireEvent('loaded', [self]);
                            resolve();
                        });
                    };

                    (function (d, s, id) {
                        var js, fjs = d.getElementsByTagName(s)[0];

                        if (d.getElementById(id)) {
                            return;
                        }

                        js     = d.createElement(s);
                        js.id  = id;
                        js.src = "//connect.facebook.net/en_US/sdk.js";

                        fjs.parentNode.insertBefore(js, fjs);
                    }(document, 'script', 'facebook-jssdk'));
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
                    'package_quiqqer_authgoogle_ajax_getAppId',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        onError  : reject
                    }
                )
            });
        }
    });
});