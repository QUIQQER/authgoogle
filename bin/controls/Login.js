/**
 * Google Authentication for QUIQQER
 *
 * @module package/quiqqer/authgoogle/bin/controls/Login
 * @author www.pcsg.de (Patrick Müller)
 * @author www.pcsg.de (Henning Leutz)
 */
define('package/quiqqer/authgoogle/bin/controls/Login', [

    'qui/controls/Control',
    'qui/controls/windows/Popup',
    'qui/controls/loader/Loader',
    'qui/controls/windows/Confirm',

    'package/quiqqer/authgoogle/bin/Google',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/controls/Login.css'

], function (QUIControl, QUIPopup, QUILoader, QUIConfirm, Google, QUIAjax, QUILocale) {
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

            this.$Input      = this.getElm();
            this.$Input.type = 'hidden';
            this.$Form       = this.$Input.getParent('form');
            this.$autoLogin  = this.$Input.get('data-autologin') === "1";

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

                    self.$FakeLoginBtn.disabled = true;
                    self.Loader.show();

                    Google.getGDPRConsent().then(function (consentGiven) {
                        if (!consentGiven) {
                            return Promise.resolve(false);
                        }

                        return self.$openGoogleLoginWindowHelper();
                    }).then(function () {
                        return self.$authenticate();
                    }).then(function () {
                        self.$FakeLoginBtn.disabled = false;
                        self.Loader.hide();
                    }).catch(function (err) {
                        console.error(err);

                        self.$FakeLoginBtn.disabled = false;
                        self.Loader.hide();
                        self.$showGeneralError();
                    });
                }
            });

            this.create().inject(this.$Input, 'after');

            //if (localStorage.getItem('quiqqer_auth_google_autoconnect')) {
            //    this.$showLoginBtn().catch(function () {
            //        self.Loader.hide();
            //    });
            //    //this.$authenticate();
            //} else {
            this.$FakeLoginBtn.disabled = false;
            //}

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
                    //Google.login().then(function () {
                    //    self.$authenticate();
                    //});
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
         * Show general error message on button and disable login btn
         */
        $showGeneralError: function () {
            if (this.$FakeLoginBtn) {
                this.$FakeLoginBtn.set('title', QUILocale.get(lg,
                    'controls.login.general_error'
                ));
            }

            if (this.$LoginBtn) {
                this.$LoginBtn.setAttribute('text', QUILocale.get(lg,
                    'controls.login.general_error'
                ));

                this.$LoginBtn.disable();
            }
        },

        /**
         *
         * @return {Promise}
         */
        $openGoogleLoginWindowHelper: function () {
            var self = this;

            //if (!Google.isLoaded()) {
            //    return new Promise(function (resolve) {
            //        Google.$load().then(function () {
            //            if (Google.isLoggedIn()) {
            //                return resolve();
            //            }
            //
            //            self.$openGoogleLoginWindowHelper().then(resolve);
            //        }, function () {
            //            resolve(false);
            //        });
            //    });
            //}

            if (Google.isLoggedIn()) {
                return Promise.resolve(true);
            }

            return new Promise(function (resolve, reject) {
                new QUIPopup({
                    icon     : 'fa fa-sign-in',
                    title    : QUILocale.get(lg, 'controls.frontend.registrar.login_popup.title'),
                    maxWidth : 500,
                    maxHeight: 300,
                    buttons  : false,
                    events   : {
                        onOpen: function (Win) {
                            Win.Loader.show();
                            Win.getContent().setStyles({
                                'alignItems'    : 'center',
                                'display'       : 'flex',
                                'flexDirection' : 'column',
                                'justifyContent': 'center'
                            });

                            Google.$load().then(function () {
                                Win.getContent().set(
                                    'html',
                                    '<p>' +
                                    QUILocale.get(lg, 'controls.register.status.login_required') +
                                    '</p>' +
                                    '<button class="qui-button quiqqer-auth-google-registration-btn qui-utils-noselect">' +
                                    '<span class="fa fa-google"></span> ' +
                                    QUILocale.get(lg, 'controls.frontend.registrar.sign_in.popup.btn') +
                                    '</button>'
                                );

                                Win.getContent().getElement('button').addEvent('click', function () {
                                    Win.Loader.show();

                                    Google.login().then(function () {
                                        self.$signedIn = false;
                                        resolve();
                                        Win.close();
                                    }).catch(function (err) {
                                        console.error(err);
                                        Win.Loader.hide();
                                    });
                                });

                                Win.Loader.hide();
                            }, function () {
                                Win.setContent(
                                    '<p>' + QUILocale.get(lg, 'controls.frontend.login.sign_in.popup.error') + '</p>'
                                );

                                Win.Loader.hide();

                                resolve(false);
                            });
                        },

                        onCancel: reject
                    }
                }).open();
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
                }, function (err) {
                    console.error(err);
                    self.$showGeneralError();
                    reject(err);
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
