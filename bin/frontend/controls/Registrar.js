/**
 * QUIQQER account registration via Google Account
 *
 * @module package/quiqqer/authgoogle/bin/frontend/controls/Registrar
 * @author www.pcsg.de (Patrick Müller)
 * @author www.pcsg.de (Henning Leutz)
 */
define('package/quiqqer/authgoogle/bin/frontend/controls/Registrar', [

    'qui/controls/Control',
    'qui/controls/windows/Popup',
    'qui/controls/loader/Loader',

    'controls/users/Login',
    'package/quiqqer/authgoogle/bin/Google',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/frontend/controls/Registrar.css'

], function (QUIControl, QUIPopup, QUILoader, QUILogin, Google, QUIAjax, QUILocale) {
    "use strict";

    var lg            = 'quiqqer/authgoogle';
    var registerCount = 0; // register count

    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/frontend/controls/Registrar',

        Binds: [
            '$onImport',
            '$init',
            '$showRegistrarBtn',
            '$getRegistrarUserId',
            '$showInfo',
            '$clearInfo',
            '$register',
            '$openRegistrationPopup'
        ],

        options: {
            uid: false  // QUIQQER User ID
        },

        initialize: function (options) {
            this.parent(options);

            this.addEvents({
                onImport: this.$onImport
            });

            this.$signedIn               = false;
            this.$TokenInput             = null;
            this.$Form                   = null;
            this.$InfoElm                = null;
            this.$BtnElm                 = null;
            this.Loader                  = new QUILoader();
            this.$Elm                    = null;
            this.$registrationBtnClicked = false;
            this.$SubmitBtn              = null;
            this.$FakeBtn                = null;
            this.$RegisterBtn            = null;
        },

        /**
         * Event: onImport
         */
        $onImport: function () {
            var self = this;

            this.$Elm = this.getElm();
            //
            // this.$Elm.addEvent('click', function (event) {
            //     var FakeRegisterBtn = self.$Elm.getElement(
            //         '.quiqqer-auth-google-registration-btn'
            //     );
            //
            //     FakeRegisterBtn.fireEvent('click', [event]);
            // });

            var RegistrarForm = this.$Elm.getElement('.quiqqer-authgoogle-registrar-form');

            if (!RegistrarForm) {
                return;
            }

            RegistrarForm.removeClass('quiqqer-authgoogle__hidden');

            this.Loader.inject(this.$Elm);

            this.$Form       = this.$Elm.getParent('form');
            this.$TokenInput = this.$Elm.getElement('input[name="token"]');
            this.$BtnElm     = this.$Elm.getElement('.quiqqer-authgoogle-registrar-btn');
            this.$InfoElm    = this.$Elm.getElement('.quiqqer-authgoogle-registrar-info');
            this.$SubmitBtn  = this.$Elm.getElement('button[type="submit"]');

            this.$Form.addEvent('submit', function (event) {
                event.stop();
            });

            var FakeRegisterBtn = this.$Elm.getElement('.quiqqer-auth-google-registration-btn');

            FakeRegisterBtn.addEvents({
                click: function (event) {
                    event.stop();

                    FakeRegisterBtn.disabled = true;
                    self.Loader.show();

                    Google.getGDPRConsent().then(function () {
                        return self.$openGoogleLoginWindowHelper();
                    }).then(function (submit) {
                        if (!submit) {
                            FakeRegisterBtn.disabled = false;
                            return;
                        }

                        return self.$init(true);
                    }).then(function () {
                        self.Loader.hide();
                    }).catch(function () {
                        FakeRegisterBtn.disabled = false;
                        self.Loader.hide();
                        self.$showGeneralError();

                        FakeRegisterBtn.set('html', QUILocale.get(lg,
                            'controls.frontend.registrar.general_error'
                        ));
                    });
                }
            });

            Google.addEvents({
                onLogin : function () {
                    self.$signedIn = true;

                    if (self.$registrationBtnClicked) {
                        self.$registrationBtnClicked = false;
                        self.$register();
                    }
                },
                onLogout: function () {
                    self.$signedIn = false;
                }
            });

            registerCount = 0;

            //if (localStorage.getItem('quiqqer_auth_google_autoconnect')) {
            //    this.$init().catch(function () {
            //        // nothing
            //    });
            //} else {
            FakeRegisterBtn.disabled = false;
            //}
        },

        /**
         * Initialize registration via Google account
         *
         * @param {Boolean} [autoregister]
         * @return {Promise}
         */
        $init: function (autoregister) {
            var self = this;

            autoregister = autoregister || false;

            this.$clearInfo();

            if (self.$signedIn) {
                return Promise.resolve();
            }

            return new Promise(function (resolve, reject) {
                Promise.all([
                    Google.getRegistrationButton(),
                    Google.isSignedIn()
                ]).then(function (result) {
                    self.$RegisterBtn = result[0];
                    self.$signedIn    = result[1];

                    self.$clearButtons();
                    self.Loader.hide();

                    self.$RegisterBtn.inject(self.$BtnElm);

                    self.$RegisterBtn.addEvent('onClick', function () {
                        self.$registrationBtnClicked = true;

                        if (self.$signedIn) {
                            self.$registrationBtnClicked = false;
                            self.$register();
                        }
                    });

                    if (autoregister) {
                        self.$register();
                    }

                    resolve();
                }, function (err) {
                    console.error(err);

                    self.Loader.hide();
                    self.$showGeneralError();
                    reject();
                });
            });
        },

        /**
         * Helper if google sdk is not loaded
         *
         * @return {Promise}
         */
        $openGoogleLoginWindowHelper: function () {
            if (Google.isLoggedIn()) {
                return Promise.resolve(true);
            }

            var self = this;

            return new Promise(function (resolve) {
                new QUIPopup({
                    icon     : 'fa fa-google',
                    title    : QUILocale.get(lg, 'controls.frontend.registrar.sign_in.popup.title'),
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
                                    QUILocale.get(lg, 'controls.register.status.unknown') +
                                    '</p>' +
                                    '<button class="qui-button quiqqer-auth-google-registration-btn qui-utils-noselect">' +
                                    QUILocale.get(lg, 'controls.frontend.registrar.sign_in.popup.btn') +
                                    '</button>'
                                );

                                Win.getContent().getElement('button').addEvent('click', function () {
                                    Win.Loader.show();

                                    Google.login().then(function () {
                                        self.$signedIn = false;
                                        resolve(true);
                                        Win.close();
                                    }).catch(function () {
                                        Win.Loader.hide();
                                    });
                                });

                                Win.Loader.hide();
                            }, function () {
                                Win.setContent(
                                    '<p>' + QUILocale.get(lg, 'controls.frontend.registrar.sign_in.popup.error') + '</p>'
                                );

                                Win.Loader.hide();

                                resolve(false);
                            });
                        },

                        onCancel: function () {
                            self.Loader.hide();
                            resolve(false);
                        }
                    }
                }).open();
            });
        },

        /**
         * Start registration process
         *
         * @return {Promise}
         */
        $register: function () {
            var self = this;

            this.Loader.show();

            if (this.$registerTimer) {
                clearTimeout(this.$registerTimer);
            }

            return new Promise(function (resolve, reject) {
                self.$registerTimer = (function () {
                    self.$executeRegister().then(resolve, reject);
                }).delay(200);
            });
        },

        /**
         * Execute registration process
         *
         * @return {Promise}
         */
        $executeRegister: function () {
            var self = this;

            var onError = function () {
                self.Loader.hide();
                self.$showGeneralError();
            };

            return Google.getToken().then(function (token) {
                self.$token = token;

                Google.isAccountConnectedToQuiqqer(token).then(function (connected) {
                    self.Loader.hide();

                    if (connected) {
                        //self.$clearButtons();
                        self.$showLoginInfo();
                        return;
                    }

                    if (registerCount >= 1) {
                        return;
                    }

                    (function () {
                        registerCount = 0;
                    }).delay(2000);

                    registerCount++;

                    self.$TokenInput.value = token;

                    self.$SubmitBtn.type = 'submit';
                    self.$SubmitBtn.click(); // simulate form submit by button click to trigger form submit event
                }, onError);
            });
        },

        /**
         * Show popup with login option
         *
         * This is shown if the user visits the registration page
         * and a QUIQQER account is already registered with his Google account
         */
        $showLoginInfo: function () {
            var self = this;

            this.Loader.show();

            Google.getProfileInfo().then(function (ProfileData) {
                self.Loader.hide();

                new QUIPopup({
                    icon              : 'fa fa-sign-in',
                    title             : QUILocale.get(lg, 'controls.frontend.registrar.login_popup.title'),
                    buttons           : false,
                    backgroundClosable: false,
                    titleCloseButton  : true,
                    maxHeight         : 400,
                    maxWidth          : 600,
                    events            : {
                        onOpen : function (Popup) {
                            var Content = Popup.getContent();

                            Content.set(
                                'html',
                                '<p>' +
                                QUILocale.get(lg, 'controls.frontend.registrar.already_connected', {
                                    email: ProfileData.email
                                }) +
                                '</p>' +
                                '<div class="google-login">' +
                                '<p>' +
                                QUILocale.get(lg, 'controls.frontend.registrar.already_connected.login.label') +
                                '</p>' +
                                '</div>'
                            );

                            // Login
                            new QUILogin({
                                authenticators: ['QUI\\Auth\\Google\\Auth']
                            }).inject(Content.getElement('.google-login'));
                        },
                        onClose: function () {
                            self.Loader.show();

                            Google.logout().then(function () {
                                self.Loader.hide();
                            });
                        }
                    }
                }).open();
            });
        },

        /**
         * Remove all buttons
         */
        $clearButtons: function () {
            this.$BtnElm.set('html', '');
        },

        /**
         * Disable registration button and show error message in btn elm title
         */
        $showGeneralError: function () {
            if (this.$RegisterBtn) {
                this.$RegisterBtn.setAttribute('title', QUILocale.get(lg,
                    'controls.frontend.registrar.general_error'
                ));

                this.$RegisterBtn.disable();
            }
        },

        /**
         * Show info text (overrides previous info messages)
         */
        $showInfo: function (msg) {
            this.$clearInfo();
            this.$InfoElm.set('html', msg);
        },

        /**
         * Remove info message
         */
        $clearInfo: function () {
            this.$InfoElm.set('html', '');
        },

        /**
         * Get ID of Registrar User
         *
         * @return {Promise}
         */
        $getRegistrarUserId: function () {
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_authgoogle_ajax_getRegistrarUserId', resolve, {
                    'package': 'quiqqer/authgoogle',
                    onError  : reject
                });
            });
        }
    });
});
