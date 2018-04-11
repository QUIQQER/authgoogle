/**
 * Google Authentication for QUIQQER
 *
 * @module package/quiqqer/authgoogle/bin/controls/Login
 * @author www.pcsg.de (Patrick Müller)
 */
define('package/quiqqer/authgoogle/bin/controls/Login', [

    'qui/controls/Control',
    'qui/controls/loader/Loader',

    'package/quiqqer/authgoogle/bin/Google',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/controls/Login.css'

], function (QUIControl, QUILoader, Google,
             QUIAjax, QUILocale) {
    "use strict";

    var lg = 'quiqqer/authgoogle';
    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/controls/Login',

        Binds: [
            '$onImport',
            '$login',
            '$showSettings',
            '$showLoginBtn',
            '$getLoginUserId',
            '$showMsg',
            '$clearMsg'
        ],

        options: {
            uid: false  // QUIQQER User ID
        },

        initialize: function (options) {
            this.parent(options);

            this.addEvents({
                onImport: this.$onImport
            });

            this.Loader           = new QUILoader();
            this.$InfoElm         = null;
            this.$BtnElm          = null;
            this.$signedIn        = false;
            this.$loginBtnClicked = false;
            this.$init            = true;
            this.$autoLogin       = false;
        },

        /**
         * event on DOMElement creation
         */
        create: function () {
            this.$Elm = new Element('div', {
                'class': 'quiqqer-auth-google-login',
                'html' : '<div class="quiqqer-auth-google-login-info"></div>' +
                '<div class="quiqqer-auth-google-login-btns"></div>'
            });

            this.$InfoElm = this.$Elm.getElement(
                '.quiqqer-auth-google-login-info'
            );

            this.$BtnElm = this.$Elm.getElement(
                '.quiqqer-auth-google-login-btns'
            );

            this.Loader.inject(this.$Elm);

            return this.$Elm;
        },

        /**
         * Event: onImport
         */
        $onImport: function () {
            var self = this;

            this.$Input      = this.getElm();
            this.$Input.type = 'hidden';
            this.$Form       = this.$Input.getParent('form');
            this.$autoLogin  = this.$Input.get('data-autologin') === "1";

            this.create().inject(this.$Input, 'after');
            this.$login();

            Google.addEvents({
                onLogin : function () {
                    self.$signedIn = true;

                    if (self.$loginBtnClicked) {
                        self.$loginBtnClicked = false;
                        self.$login();
                    }
                },
                onLogout: function () {
                    self.$signedIn = false;
                }
            });
        },

        /**
         * Login
         */
        $login: function () {
            var self = this;

            this.Loader.show();

            this.$clearMsg();

            Promise.all([
                self.$getLoginUserId(),
                Google.isSignedIn()
            ]).then(function (result) {
                var loginUserId = result[0];

                self.$signedIn = result[1];

                self.$showLoginBtn();

                if (self.$init) {
                    self.$init = false;

                    if (!self.$signedIn || !self.$autoLogin) {
                        self.Loader.hide();
                        return;
                    }
                }

                Google.getToken().then(function (token) {
                    self.$token = token;

                    Google.isAccountConnectedToQuiqqer(token).then(function (connected) {
                        if (!connected && loginUserId) {
                            self.$showSettings(loginUserId, status);
                            self.Loader.hide();
                            return;
                        }

                        // if there is no previous user id in the user session
                        // Google auth is used as a primary authenticator
                        if (!loginUserId) {
                            self.$Input.value = token;
                            self.$Form.fireEvent('submit', [self.$Form]);

                            return;
                        }

                        // check if login user is google user
                        self.$isLoginUserGoogleUser(token).then(function (isLoginUser) {
                            self.Loader.hide();

                            if (!isLoginUser) {
                                self.Loader.show();

                                self.$loginAttemptsCheck().then(function (maxLoginsExceeded) {
                                    self.Loader.hide();

                                    if (maxLoginsExceeded) {
                                        window.location = window.location;
                                        return;
                                    }

                                    self.$showMsg(QUILocale.get(lg, 'controls.login.wrong.google.user'));

                                    //self.$showConnectBtn();

                                    Google.getLogoutButton().inject(self.$BtnElm);
                                });
                                return;
                            }

                            self.$Input.value = token;
                            self.$Form.fireEvent('submit', [self.$Form]);
                        });
                    });
                });

                self.Loader.hide();
            });
        },

        /**
         * Shows settings control
         *
         * @param {number} uid - QUIQQER User ID
         * @param {string} status - Google Login status
         */
        $showSettings: function (uid, status) {
            var self = this;

            this.Loader.show();
            this.$clearMsg();

            var emailProvided = true;

            require([
                'package/quiqqer/authgoogle/bin/controls/Settings'
            ], function (SettingsControl) {
                self.Loader.hide();
                var Settings = new SettingsControl({
                    uid   : uid,
                    events: {
                        onAccountConnected: function (Account, Control) {
                            self.$login();
                            Control.destroy();
                        },
                        onLoaded          : function () {
                            switch (status) {
                                case 'connected':
                                    if (!emailProvided) {
                                        Settings.setInfoText(
                                            QUILocale.get(lg, 'controls.login.register.status.not_authorized')
                                        );

                                        return;
                                    }

                                    Settings.setInfoText(
                                        QUILocale.get(lg, 'controls.login.register.status.connected')
                                    );
                                    break;
                            }
                        },
                        onAuthWithoutEmail: function () {
                            emailProvided = false;
                        }
                    }
                }).inject(self.$InfoElm);
            });
        },

        /**
         * Show login button
         */
        $showLoginBtn: function () {
            var self          = this;
            var FakeButtonElm = this.$Elm.getParent().getElement(
                '.quiqqer-auth-google-login-btn'
            );

            Google.getLoginButton().then(function (LoginBtn) {
                if (FakeButtonElm) {
                    FakeButtonElm.destroy();
                }

                LoginBtn.inject(self.$BtnElm);

                LoginBtn.addEvent('onClick', function () {
                    self.$loginBtnClicked = true;

                    if (self.$signedIn) {
                        self.$login();
                    }
                });
            }, function () {
                self.$showMsg(QUILocale.get(lg,
                    'controls.login.general_error'
                ));

                if (FakeButtonElm) {
                    FakeButtonElm.destroy();
                }
            });
        },

        /**
         * Checks if the current QUIQQER Login user is the Google user
         *
         * @param {string} idToken - Google API token
         * @return {Promise}
         */
        $isLoginUserGoogleUser: function (idToken) {
            return new Promise(function (resolve, reject) {
                QUIAjax.get(
                    'package_quiqqer_authgoogle_ajax_isLoginUserGoogleUser',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        idToken  : idToken,
                        onError  : reject
                    }
                );
            });
        },

        /**
         * Get ID of Login User
         *
         * @return {Promise}
         */
        $getLoginUserId: function () {
            return new Promise(function (resolve, reject) {
                QUIAjax.get(
                    'package_quiqqer_authgoogle_ajax_getLoginUserId',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        onError  : reject
                    }
                );
            });
        },

        /**
         * Check Google login attempts
         *
         * @return {Promise}
         */
        $loginAttemptsCheck: function () {
            return new Promise(function (resolve, reject) {
                QUIAjax.post(
                    'package_quiqqer_authgoogle_ajax_loginAttemptsCheck',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        onError  : reject
                    }
                );
            });
        },

        /**
         * Show info message
         *
         * @param {String} msg
         */
        $showMsg: function (msg) {
            this.$InfoElm.setStyle('display', '');
            this.$InfoElm.set('html', msg);
        },

        /**
         * Clear info message
         */
        $clearMsg: function () {
            this.$InfoElm.setStyle('display', 'none');
        }
    });
});