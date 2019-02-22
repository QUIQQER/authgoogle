/**
 * Google Authentication for QUIQQER
 *
 * @module package/quiqqer/authgoogle/bin/controls/Login
 * @author www.pcsg.de (Patrick Müller)
 */
define('package/quiqqer/authgoogle/bin/controls/Login', [

    'qui/controls/Control',
    'qui/controls/loader/Loader',
    'qui/controls/windows/Confirm',

    'package/quiqqer/authgoogle/bin/Google',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/controls/Login.css'

], function (QUIControl, QUILoader, QUIConfirm, Google, QUIAjax, QUILocale) {
    "use strict";

    var lg = 'quiqqer/authgoogle';

    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/controls/Login',

        Binds: [
            '$onImport',
            '$authenticate',
            '$showSettings',
            '$showLoginBtn',
            '$getLoginUserId',
            '$showMsg',
            '$clearMsg',
            '$openLoginPopup'
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
            this.$FakeLoginBtn    = null;
            this.$LoginBtn        = null;
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

            this.$Input        = this.getElm();
            this.$Input.type   = 'hidden';
            this.$Form         = this.$Input.getParent('form');
            this.$autoLogin    = this.$Input.get('data-autologin') === "1";
            this.$FakeLoginBtn = this.$Elm.getParent().getElement(
                '.quiqqer-auth-google-login-btn'
            );

            this.getElm().getParent('.quiqqer-google-login').set({
                'data-quiid': this.getId(),
                'data-qui'  : this.getType()
            });

            this.$FakeLoginBtn.addEvents({
                click: function (event) {
                    event.stop();
                    localStorage.setItem('quiqqer_auth_google_autoconnect', true);

                    self.$FakeLoginBtn.disabled = true;
                    self.Loader.show();

                    self.$showLoginBtn().then(function () {
                        self.Loader.hide();
                        self.$openLoginPopup();
                    }, function () {
                        self.Loader.hide();
                    });
                }
            });

            this.create().inject(this.$Input, 'after');

            if (localStorage.getItem('quiqqer_auth_google_autoconnect')) {
                this.$showLoginBtn();
                //this.$authenticate();
            } else {
                this.$FakeLoginBtn.disabled = false;
            }

            Google.addEvents({
                onLogin : function () {
                    self.$signedIn = true;

                    if (self.$loginBtnClicked) {
                        self.$loginBtnClicked = false;
                        self.$authenticate();
                    }
                },
                onLogout: function () {
                    self.$signedIn = false;
                }
            });
        },

        /**
         * Execute a click at the google login
         */
        click: function () {
            if (this.$LoginBtn) {
                this.$LoginBtn.click();
                return;
            }

            this.$FakeLoginBtn.click();
        },

        /**
         * Authenticate with Google account
         *
         * @return {Promise}
         */
        $authenticate: function () {
            var self = this;

            this.$clearMsg();

            return Promise.all([
                self.$getLoginUserId(),
                Google.isSignedIn()
            ]).then(function (result) {
                var loginUserId = result[0];

                self.$signedIn = result[1];

                if (!self.$signedIn) {
                    return;
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
                                    Google.getLogoutButton().inject(self.$BtnElm);
                                });
                                return;
                            }

                            self.$Input.value = token;
                            self.$Form.fireEvent('submit', [self.$Form]);
                        });
                    });
                });
            }, function () {
                self.$showGeneralError();
            });
        },

        /**
         * Opens Popup with a separate Google Login button
         *
         * This is only needed if the user first has to "agree" to the connection
         * to Google by clicking the original Login button
         */
        $openLoginPopup: function () {
            var self = this;

            new QUIConfirm({
                'class'  : 'quiqqer-auth-google-login-popup',
                icon     : 'fa fa-google',
                title    : 'Google Login',
                maxHeight: 200,
                maxWidth : 350,
                buttons  : false,
                events   : {
                    onOpen: function (Popup) {
                        var Content = Popup.getContent();

                        Content.set('html', '');

                        Popup.Loader.show();

                        Google.getLoginButton().then(function (LoginBtn) {
                            Popup.Loader.hide();

                            LoginBtn.inject(Content);

                            LoginBtn.setAttribute(
                                'text',
                                QUILocale.get(lg, 'controls.login.popup.btn.text')
                            );

                            LoginBtn.addEvent('onClick', function () {
                                self.$init            = false;
                                self.$loginBtnClicked = true;

                                self.$authenticate();
                                Popup.close();
                            });
                        }, function () {
                            Popup.close();
                            self.$showGeneralError();
                        });
                    }
                }
            }).open();
        },

        /**
         * Show general error message on button and disable login btn
         */
        $showGeneralError: function () {
            if (this.$FakeLoginBtn) {
                this.$FakeLoginBtn.set('title', QUILocale.get(lg,
                    'controls.login.general_error'
                ));
            }

            if (this.$LoginBtn) {
                this.$LoginBtn.setAttribute('title', QUILocale.get(lg,
                    'controls.login.general_error'
                ));

                this.$LoginBtn.disable();
            }
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
                            self.$authenticate();
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
         *
         * @return {Promise}
         */
        $showLoginBtn: function () {
            var self = this;

            return new Promise(function (resolve, reject) {
                Google.getLoginButton().then(function (LoginBtn) {
                    self.$LoginBtn = LoginBtn;

                    if (self.$FakeLoginBtn) {
                        self.$FakeLoginBtn.destroy();
                        self.$FakeLoginBtn = null;
                    }

                    self.$LoginBtn.inject(self.$BtnElm);

                    self.$LoginBtn.addEvent('onClick', function () {
                        self.$loginBtnClicked = true;
                        self.$authenticate();
                    });

                    resolve();
                }, function () {
                    self.$showGeneralError();
                    reject();
                });
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