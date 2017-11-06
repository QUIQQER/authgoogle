/**
 * Google Authentication for QUIQQER
 *
 * @module package/quiqqer/authgoogle/bin/controls/Login
 * @author www.pcsg.de (Patrick Müller)
 */
define('package/quiqqer/authgoogle/bin/controls/Login', [

    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Button',
    'qui/controls/loader/Loader',

    'package/quiqqer/authgoogle/bin/Google',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/controls/Login.css'

], function (QUIControl, QUIConfirm, QUIButton, QUILoader, Google,
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
            '$getLoginUserId'
        ],

        options: {
            uid: false  // QUIQQER User ID
        },

        initialize: function (options) {
            this.parent(options);

            this.addEvents({
                onImport: this.$onImport
            });

            this.Loader    = new QUILoader();
            this.$InfoElm  = null;
            this.$BtnElm   = null;
            this.$signedIn = false;
            this.$token    = false;
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

            this.create().inject(this.$Input, 'after');
            this.$login();

            Google.addEvents({
                onLogin: function () {
                    self.$BtnElm.set('html', '');
                    self.$signedIn = true;
                    self.$login();
                }
            });

            Google.addEvents({
                onLogout: function () {
                    self.$BtnElm.set('html', '');
                    self.$signedIn = false;
                    self.$login();
                }
            });
        },

        /**
         * Login
         */
        $login: function () {
            var self = this;

            this.Loader.show();

            this.$InfoElm.set('html', '');

            self.$getLoginUserId().then(function (loginUserId) {
                if (!self.$signedIn) {
                    self.$showLoginBtn();
                    self.Loader.hide();

                    return;
                }

                Google.getToken().then(function (token) {
                    self.$token = token;

                    Google.isAccountConnectedToQuiqqer(token).then(function (connected) {
                        if (!connected) {
                            if (loginUserId) {
                                self.$showSettings(loginUserId, status);
                            } else {
                                self.$InfoElm.set(
                                    'html',
                                    QUILocale.get(lg, 'controls.login.no.quiqqer.account')
                                );

                                Google.getLogoutButton().inject(self.$BtnElm);
                            }

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

                                    self.$InfoElm.set(
                                        'html',
                                        QUILocale.get(lg, 'controls.login.wrong.google.user')
                                    );

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

        //$showConnectBtn: function () {
        //    var self = this;
        //
        //    new QUIButton({
        //        text     : 'Jetzt verknüpfen',
        //        textimage: 'fa fa-link',
        //        events   : {
        //            onClick: function () {
        //                self.Loader.show();
        //
        //                Google.connectQuiqqerAccount(
        //                    self.getAttribute('uid'),
        //                    self.$token
        //                ).then(function (Account) {
        //                    self.Loader.hide();
        //
        //                    if (!Account) {
        //                        return;
        //                    }
        //
        //                    self.$InfoElm.set(
        //                        'html',
        //                        'Account erfolgreich verknüpft!'
        //                    );
        //
        //                    self.$login();
        //                });
        //            }
        //        }
        //    }).inject(self.$BtnElm);
        //},

        /**
         * Shows settings control
         *
         * @param {number} uid - QUIQQER User ID
         * @param {string} status - Google Login status
         */
        $showSettings: function (uid, status) {
            var self = this;

            this.Loader.show();
            this.$InfoElm.set('html', '');

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
            Google.getLoginButton().inject(this.$BtnElm);
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
                )
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
                )
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
                )
            });
        }
    });
});