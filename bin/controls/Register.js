/**
 * Registration of QUIQQER User account via Google Login
 *
 * @module package/quiqqer/authgoogle/bin/controls/Register
 * @author www.pcsg.de (Patrick Müller)
 *
 * @require qui/controls/Control
 * @require qui/controls/windows/Confirm
 * @require qui/controls/buttons/Button
 * @require qui/controls/loader/Loader
 * @require package/quiqqer/authgoogle/bin/Google
 * @require Mustache
 * @requrie Ajax
 * @require Locale
 * @require css!package/quiqqer/authgoogle/bin/controls/Register.css
 *
 */
define('package/quiqqer/authgoogle/bin/controls/Register', [

    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Button',
    'qui/controls/loader/Loader',

    'package/quiqqer/authgoogle/bin/Google',

    'Mustache',
    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/controls/Register.css'

], function (QUIControl, QUIConfirm, QUIButton, QUILoader, Google, Mustache,
             QUIAjax, QUILocale) {
    "use strict";

    var lg = 'quiqqer/authgoogle';
    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/controls/Register',

        Binds: [
            '$onInject'
        ],

        options: {
            uid: false  // QUIQQER User ID
        },

        initialize: function (options) {
            this.parent(options);

            this.addEvents({
                onInject: this.$onInject
            });

            this.Loader   = new QUILoader();
            this.$InfoElm = null;
            this.$BtnsElm = null;
        },

        /**
         * event on DOMElement creation
         */
        create: function () {
            this.$Elm = new Element('div', {
                'class': 'quiqqer-auth-google-register',
                html   : '<div class="quiqqer-auth-google-register-info"></div>' +
                '<div class="quiqqer-auth-google-register-btns"></div>'
            });

            this.$InfoElm = this.$Elm.getElement(
                '.quiqqer-auth-google-register-info'
            );

            this.$BtnsElm = this.$Elm.getElement(
                '.quiqqer-auth-google-register-btns'
            );

            this.Loader.inject(this.$Elm);

            return this.$Elm;
        },

        /**
         * Event: onInject
         */
        $onInject: function () {
            var self = this;

            this.$showRegisterInfo();

            Google.addEvents({
                onLogin: function () {
                    self.$startRegistration();
                }
            });
        },

        /**
         * Show registration info
         */
        $showRegisterInfo: function () {
            var self = this;

            this.Loader.show();

            Google.isSignedIn().then(function (isSignedIn) {
                if (!isSignedIn) {
                    self.Loader.hide();

                    self.setInfoText(QUILocale.get(lg, 'controls.register.status.unknown'));

                    Google.getLoginButton().then(function (LoginBtn) {
                        LoginBtn.inject(this.$BtnElm);
                    }, function () {
                        self.setInfoText(QUILocale.get(lg,
                            'controls.register.general_error'
                        ));
                    });
                    return;
                }

                Google.getAuthData().then(function (AuthData) {
                    Google.isAccountConnectedToQuiqqer(AuthData.id_token).then(function (connected) {
                        self.Loader.hide();

                        if (connected) {
                            self.setInfoText(
                                QUILocale.get(lg, 'controls.register.status.connected.account.exists')
                            );

                            return;
                        }

                        self.$startRegistration();
                    });
                });
            });
        },

        /**
         * Start registration process
         */
        $startRegistration: function () {
            var self = this;

            self.$BtnsElm.set('html', '');

            this.Loader.show();

            Google.getProfileInfo().then(function (Profile) {
                self.Loader.hide();

                self.setInfoText(
                    QUILocale.get(lg, 'controls.register.registration.confirm', {
                        name : Profile.first_name + ' ' + Profile.last_name,
                        email: Profile.email
                    })
                );

                new QUIButton({
                    textimage: 'fa fa-user-plus',
                    text     : QUILocale.get(lg, 'controls.register.registration.confirm.btn.text'),
                    events   : {
                        onClick: function (Btn) {
                            self.Loader.show();

                            self.createAccount(Profile.email).then(function (newUserId) {
                                self.Loader.hide();
                                Btn.destroy();

                                self.setInfoText(
                                    QUILocale.get(lg, 'controls.register.registration.success', {
                                        email: Profile.email
                                    })
                                );
                            }, function (Exception) {
                                self.Loader.hide();
                                Btn.destroy();

                                self.setInfoText(
                                    QUILocale.get(lg, 'controls.register.registration.error', {
                                        error: '<span class="quiqqer-auth-google-register-error">'
                                        + Exception.getMessage() + '</span>'
                                    })
                                );
                            });
                        }
                    }
                }).inject(self.$BtnsElm);
            });
        },

        /**
         * Set information text
         *
         * @param {string} text
         */
        setInfoText: function (text) {
            this.$InfoElm.set('html', text);
        },

        /**
         * Create new QUIQQER account with Google email adress
         *
         * @param {string} email
         * @return {Promise}
         */
        createAccount: function (email) {
            return new Promise(function (resolve, reject) {
                Google.getToken().then(function (token) {
                    QUIAjax.post(
                        'package_quiqqer_authgoogle_ajax_createAccount',
                        resolve, {
                            'package': 'quiqqer/authgoogle',
                            email    : email,
                            idToken  : token,
                            onError  : reject
                        }
                    )
                });
            });
        }
    });
});