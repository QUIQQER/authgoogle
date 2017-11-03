/**
 * QUIQQER account registration via Google Account
 *
 * @module package/quiqqer/authgoogle/bin/frontend/controls/Registrar
 * @author www.pcsg.de (Patrick Müller)
 */
define('package/quiqqer/authgoogle/bin/frontend/controls/Registrar', [

    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Button',
    'qui/controls/loader/Loader',

    'package/quiqqer/authgoogle/bin/Google',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/frontend/controls/Registrar.css'

], function (QUIControl, QUIConfirm, QUIButton, QUILoader, Google,
             QUIAjax, QUILocale) {
    "use strict";

    var lg = 'quiqqer/authgoogle';
    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/frontend/controls/Registrar',

        Binds: [
            '$onImport',
            '$login',
            '$showSettings',
            '$showRegistrarBtn',
            '$getRegistrarUserId'
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

            this.$Elm        = this.getElm();
            this.$TokenInput = this.$Elm.getElement('input[name="token"]');
            this.$BtnElm     = this.$Elm.getElement('.quiqqer-authgoogle-registrar-btn');
            this.$InfoElm    = this.$Elm.getElement('.quiqqer-authgoogle-registrar-info');

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
         * Registrar
         */
        $login: function () {
            var self = this;

            this.Loader.show();

            if (!self.$signedIn) {
                self.$InfoElm.set(
                    'html',
                    QUILocale.get(lg, 'controls.login.status.unknown')
                );

                Google.getRegistrationButton().inject(this.$BtnElm);


                self.Loader.hide();

                return;
            }

            Google.getToken().then(function (token) {
                self.$token = token;

                Google.isAccountConnectedToQuiqqer(token).then(function (connected) {
                    if (connected) {
                        self.$InfoElm.set(
                            'html',
                            QUILocale.get(lg, 'controls.frontend.registrar.already_connected')
                        );

                        Google.getLogoutButton().inject(self.$BtnElm);

                        return;
                    }

                    if (!connected) {
                        self.$InfoElm.set(
                            'html',
                            'Bitte kurwa verbinden!'
                        );

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
                    self.$isRegistrarUserGoogleUser(token).then(function (isRegistrarUser) {
                        self.Loader.hide();

                        if (!isRegistrarUser) {
                            self.Loader.show();

                            self.$loginAttemptsCheck().then(function (maxRegistrarsExceeded) {
                                self.Loader.hide();

                                if (maxRegistrarsExceeded) {
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
        },

        /**
         * Checks if the current QUIQQER Registrar user is the Google user
         *
         * @param {string} idToken - Google API token
         * @return {Promise}
         */
        $isRegistrarUserGoogleUser: function (idToken) {
            return new Promise(function (resolve, reject) {
                QUIAjax.get(
                    'package_quiqqer_authgoogle_ajax_isRegistrarUserGoogleUser',
                    resolve, {
                        'package': 'quiqqer/authgoogle',
                        idToken  : idToken,
                        onError  : reject
                    }
                )
            });
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