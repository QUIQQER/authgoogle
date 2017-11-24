/**
 * QUIQQER account registration via Google Account
 *
 * @module package/quiqqer/authgoogle/bin/frontend/controls/Registrar
 * @author www.pcsg.de (Patrick Müller)
 */
define('package/quiqqer/authgoogle/bin/frontend/controls/Registrar', [

    'qui/controls/Control',
    'qui/controls/windows/Popup',
    'qui/controls/buttons/Button',
    'qui/controls/loader/Loader',

    'controls/users/Login',
    'package/quiqqer/authgoogle/bin/Google',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/frontend/controls/Registrar.css'

], function (QUIControl, QUIPopup, QUIButton, QUILoader, QUILogin, Google,
             QUIAjax, QUILocale) {
    "use strict";

    var lg = 'quiqqer/authgoogle';
    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/frontend/controls/Registrar',

        Binds: [
            '$onImport',
            '$login',
            '$showRegistrarBtn',
            '$getRegistrarUserId',
            '$showInfo',
            '$clearInfo'
        ],

        options: {
            uid: false  // QUIQQER User ID
        },

        initialize: function (options) {
            this.parent(options);

            this.addEvents({
                onImport: this.$onImport
            });

            this.$signedIn   = false;
            this.$TokenInput = null;
            this.$Form       = null;
            this.$InfoElm    = null;
            this.$BtnElm     = null;
            this.Loader      = new QUILoader();
            this.$Elm        = null;
        },

        /**
         * Event: onImport
         */
        $onImport: function () {
            var self = this;

            this.$Elm = this.getElm();

            var RegistrarForm = this.$Elm.getElement('.quiqqer-authgoogle-registrar-form');

            if (!RegistrarForm) {
                return;
            }

            RegistrarForm.removeClass('quiqqer-authgoogle__hidden');

            this.Loader.inject(this.$Elm);

            this.$Form       = this.$Elm.getParent('form');
            this.$TokenInput = this.$Elm.getElement('input[name="token"]');
            this.$BtnElm  = this.$Elm.getElement('.quiqqer-authgoogle-registrar-btn');
            this.$InfoElm = this.$Elm.getElement('.quiqqer-authgoogle-registrar-info');

            this.$login();

            Google.addEvents({
                onLogin: function () {
                    self.$signedIn = true;
                    self.$login();
                }
            });

            Google.addEvents({
                onLogout: function () {
                    self.$signedIn = false;
                    self.$login();
                }
            });
        },

        /**
         * Start login process
         */
        $login: function () {
            var self = this;

            this.Loader.show();
            this.$clearInfo();

            if (!self.$signedIn) {
                Google.getRegistrationButton().then(function (RegistrationBtn) {
                    self.$clearButtons();
                    RegistrationBtn.inject(self.$BtnElm);
                }, function () {
                    self.$clearButtons();
                    self.$showInfo(
                        QUILocale.get(lg, 'controls.frontend.registrar.general_error')
                    );
                });

                self.Loader.hide();

                return;
            }

            Google.getToken().then(function (token) {
                self.$token = token;

                Google.isAccountConnectedToQuiqqer(token).then(function (connected) {
                    if (connected) {
                        self.$clearButtons();
                        self.Loader.show();
                        self.$showLoginInfo();

                        return;
                    }

                    self.$TokenInput.value = token;
                    self.$Form.submit();
                }, function () {
                    self.$showInfo(
                        QUILocale.get(lg, 'controls.frontend.registrar.general_error')
                    );
                });
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

                var msg = QUILocale.get(lg,
                    'controls.frontend.registrar.already_connected', {
                        email: ProfileData.email
                    });

                self.$showInfo(msg);

                new QUIPopup({
                    icon              : 'fa fa-sign-in',
                    title             : QUILocale.get(lg, 'controls.frontend.registrar.login_popup.title'),
                    buttons           : false,
                    backgroundClosable: false,
                    titleCloseButton  : true,
                    events            : {
                        onOpen: function (Popup) {
                            Popup.Loader.show();

                            var Content = Popup.getContent();

                            Content.set(
                                'html',
                                '<p>' + msg + '</p>' +
                                '<div class="google-login"></div>'
                            );

                            // Login
                            Google.logout().then(function() {
                                new QUILogin().inject(
                                    Content.getElement('.google-login')
                                );

                                Popup.Loader.hide();
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
                QUIAjax.get(
                    'package_quiqqer_authgoogle_ajax_getRegistrarUserId',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        onError  : reject
                    }
                )
            });
        }
    });
});