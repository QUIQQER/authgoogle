/**
 * Registration of QUIQQER User account via Facebook Login
 *
 * @module package/quiqqer/authgoogle/bin/controls/Register
 * @author www.pcsg.de (Patrick Müller)
 *
 * @require qui/controls/Control
 * @require qui/controls/windows/Confirm
 * @require qui/controls/buttons/Button
 * @require qui/controls/loader/Loader
 * @require package/quiqqer/authgoogle/bin/Facebook
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

    'package/quiqqer/authgoogle/bin/Facebook',

    'Mustache',
    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/controls/Register.css'

], function (QUIControl, QUIConfirm, QUIButton, QUILoader, Facebook, Mustache,
             QUIAjax, QUILocale) {
    "use strict";

    var lg = 'quiqqer/authgoogle';
    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/controls/Register',

        Binds: [
            '$onInject',
            '$onCreate'
        ],

        options: {
            uid: false
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
                'class': 'quiqqer-auth-facebook-register',
                html   : '<div class="quiqqer-auth-facebook-register-info"></div>' +
                '<div class="quiqqer-auth-facebook-register-btns"></div>'
            });

            this.$InfoElm = this.$Elm.getElement(
                '.quiqqer-auth-facebook-register-info'
            );

            this.$BtnsElm = this.$Elm.getElement(
                '.quiqqer-auth-facebook-register-btns'
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

            Facebook.addEvents({
                onLogin: function () {
                    self.$startRegistration();
                }
            });
        },

        /**
         * Show info of connected facebook account
         *
         * @param {Object} Account - Data of connected Facebook account
         */
        $showAccountInfo: function (Account) {
            var self = this;

            this.$BtnsElm.set('html', '');
            this.$InfoElm.set(
                'html',
                QUILocale.get(
                    'quiqqer/authgoogle',
                    'controls.settings.showAccountInfo.text',
                    Account
                )
            );

            new QUIButton({
                'class'  : 'quiqqer-auth-facebook-register-btn',
                textimage: 'fa fa-unlink',
                text     : QUILocale.get(lg, 'controls.settings.showAccountInfo.btn.disconnect'),
                events   : {
                    onClick: function (Btn) {
                        self.Loader.show();

                        Facebook.disconnectQuiqqerAccount(
                            self.getAttribute('uid')
                        ).then(function (success) {
                            self.Loader.hide();

                            if (success) {
                                Btn.destroy();
                                self.$showConnectionInfo();
                            }
                        });
                    }
                }
            }).inject(
                this.$Elm
            );
        },

        /**
         * Show registration info
         */
        $showRegisterInfo: function () {
            var self = this;

            this.Loader.show();

            Facebook.getStatus().then(function (status) {
                switch (status) {
                    case 'connected':
                        Facebook.getAuthData().then(function (AuthData) {
                            Facebook.isAccountConnectedToQuiqqer(AuthData.userID).then(function (connected) {
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
                        break;

                    case 'not_authorized':
                        self.Loader.hide();

                        self.setInfoText(QUILocale.get(lg, 'controls.register.status.not_authorized'));

                        Facebook.getAuthButton().inject(self.$BtnsElm);
                        break;

                    case 'unknown':
                        self.Loader.hide();

                        self.setInfoText(QUILocale.get(lg, 'controls.register.status.unknown'));
                        Facebook.getLoginButton().inject(self.$BtnsElm);
                        break;
                }
            });
        },

        /**
         * Start registration process
         */
        $startRegistration: function () {
            var self = this;

            self.$BtnsElm.set('html', '');

            this.Loader.show();

            this.$checkProfilePermissions().then(function (profileEligible) {
                if (!profileEligible) {
                    self.Loader.hide();

                    self.setInfoText(
                        QUILocale.get(lg, 'controls.register.registration.profile.not.eligible')
                    );

                    Facebook.getAuthButton(true).inject(self.$BtnsElm);

                    return;
                }

                Facebook.getProfileInfo().then(function (Profile) {
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

                                self.createAccount(Profile.email).then(function(newUserId) {
                                    self.Loader.hide();
                                    Btn.destroy();

                                    self.setInfoText(
                                        QUILocale.get(lg, 'controls.register.registration.success', {
                                            email: Profile.email
                                        })
                                    );
                                }, function(Exception) {
                                    self.Loader.hide();
                                    Btn.destroy();

                                    self.setInfoText(
                                        QUILocale.get(lg, 'controls.register.registration.error', {
                                            error: '<span class="quiqqer-auth-facebook-register-error">'
                                            + Exception.getMessage() + '</span>'
                                        })
                                    );
                                });
                            }
                        }
                    }).inject(self.$BtnsElm);
                });


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
         * Create new QUIQQER account with Facebook email adress
         *
         * @param {string} email
         * @return {Promise}
         */
        createAccount: function (email) {
            return new Promise(function (resolve, reject) {
                Facebook.getAuthData().then(function (AuthData) {
                    QUIAjax.post(
                        'package_quiqqer_authfacebook_ajax_createAccount',
                        resolve, {
                            'package': 'quiqqer/authgoogle',
                            email    : email,
                            fbToken  : AuthData.accessToken,
                            onError  : reject
                        }
                    )
                });
            });
        },

        /**
         * Check if the Facebook permissions given to QUIQQER
         * are sufficient for the registration process
         *
         * @return {Promise}
         */
        $checkProfilePermissions: function () {
            return new Promise(function (resolve, reject) {
                Facebook.getProfileInfo().then(function (Profile) {
                    resolve(typeof Profile.email !== 'undefined');
                });
            });
        },

        /**
         * Show info on how to connect a facebook account
         */
        $showConnectionInfo: function () {
            var self = this;

            this.Loader.show();

            this.$BtnsElm.set('html', '');

            Facebook.getStatus().then(function (status) {
                switch (status) {
                    case 'connected':
                        Promise.all([
                            Facebook.getProfileInfo(),
                            Facebook.getAuthData()
                        ]).then(function (result) {
                            var Profile  = result[0];
                            var AuthData = result[1];

                            // Check if user provided email
                            if (typeof Profile.email === 'undefined') {
                                self.$InfoElm.set(
                                    'html',
                                    QUILocale.get(lg, 'controls.settings.addAccount.email.unknown', {
                                        'name': Profile.first_name + ' ' + Profile.last_name
                                    })
                                );

                                Facebook.getLoginButton().inject(self.$BtnsElm);
                                return;
                            }

                            var QUser = self.getAttribute('User');

                            self.$InfoElm.set(
                                'html',
                                QUILocale.get(
                                    lg,
                                    'controls.settings.addAccount.info.connected', {
                                        'name'     : Profile.first_name + ' ' + Profile.last_name,
                                        'email'    : Profile.email,
                                        'qUserName': QUser.getUsername(),
                                        'qUserId'  : QUser.getId()
                                    }
                                )
                            );

                            new QUIButton({
                                'class'  : 'quiqqer-auth-facebook-register-btn',
                                textimage: 'fa fa-link',
                                text     : QUILocale.get(lg, 'controls.settings.addAccount.btn.connect'),
                                events   : {
                                    onClick: function () {
                                        self.Loader.show();

                                        Facebook.connectQuiqqerAccount(
                                            self.getAttribute('uid'),
                                            AuthData.accessToken
                                        ).then(function (Account) {
                                            self.$showAccountInfo(Account);
                                            self.Loader.hide();
                                        });
                                    }
                                }
                            }).inject(self.$BtnsElm);
                        });
                        break;

                    case 'not_authorized':
                        self.$InfoElm.set(
                            'html',
                            QUILocale.get(lg, 'controls.settings.addAccount.info.not_authorized')
                        );

                        Facebook.getLoginButton().inject(self.$BtnsElm);
                        Facebook.addEvents({
                            'onLogin': function () {
                                self.$showConnectionInfo();
                            }
                        });
                        break;

                    default:
                        self.$InfoElm.set(
                            'html',
                            QUILocale.get(lg, 'controls.settings.addAccount.info.unknown')
                        );

                        Facebook.getLoginButton().inject(self.$BtnsElm);
                        Facebook.addEvents({
                            'onLogin': function () {
                                self.$showConnectionInfo();
                            }
                        });
                }

                self.Loader.hide();
            });
        }
    });
});