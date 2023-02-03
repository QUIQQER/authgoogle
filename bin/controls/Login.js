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

    'package/quiqqer/authgoogle/bin/Google',

    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/controls/Login.css'

], function (QUIControl, QUIPopup, QUILoader, Google, QUIAjax, QUILocale) {
    "use strict";

    var lg = 'quiqqer/authgoogle';

    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/controls/Login',

        Binds: [
            '$onImport',
            '$authenticate',
            '$showSettings',
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

                    self.$authenticate().then(function () {
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

            this.$FakeLoginBtn.disabled = false;
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
            this.$clearMsg();

            return Promise.all([
                this.$getLoginUserId(),
                Google.authenticate()
            ]).then((result) => {
                const loginUserId = result[0];
                const token       = result[1];

                if (!token) {
                    return;
                }

                this.$token = token;

                Google.isAccountConnectedToQuiqqer(token).then((connected) => {
                    if (!connected && loginUserId) {
                        this.$showSettings(loginUserId);
                        this.Loader.hide();
                        return;
                    }

                    // if there is no previous user id in the user session
                    // Google auth is used as a primary authenticator
                    if (!loginUserId) {
                        this.$Input.value = token;
                        this.$Form.fireEvent('submit', [this.$Form]);

                        return;
                    }

                    // check if login user is google user
                    this.$isLoginUserGoogleUser(token).then((isLoginUser) => {
                        this.Loader.hide();

                        if (!isLoginUser) {
                            this.Loader.show();

                            this.$loginAttemptsCheck().then((maxLoginsExceeded) => {
                                this.Loader.hide();

                                if (maxLoginsExceeded) {
                                    window.location = window.location;
                                    return;
                                }

                                this.$showMsg(QUILocale.get(lg, 'controls.login.wrong.google.user'));
                            });
                            return;
                        }

                        this.$Input.value = token;
                        this.$Form.fireEvent('submit', [this.$Form]);
                    });
                });
            }).catch(() => {
                this.$showGeneralError();
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
                        onAuthWithoutEmail: function () {
                            emailProvided = false;
                        }
                    }
                }).inject(self.$InfoElm);
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
