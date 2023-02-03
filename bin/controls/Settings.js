/**
 * Settings for Google QUIQQER Authentication
 *
 * @module package/quiqqer/authgoogle/bin/controls/Settings
 * @author www.pcsg.de (Patrick Müller)
 *
 * @event onLoaded [self] - fires when all information is gathered and control is loaded
 * @event onAccountConnected [Account, self] - fires if the user connects his QUIQQER account
 * with his Google account
 * @event onAccountDisconnected [userId, self] - fires if the user disconnects his QUIQQER account from
 * his Google account
 */
define('package/quiqqer/authgoogle/bin/controls/Settings', [

    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Button',
    'qui/controls/loader/Loader',

    'package/quiqqer/authgoogle/bin/Google',

    'Mustache',
    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/controls/Settings.css'

], function (QUIControl, QUIConfirm, QUIButton, QUILoader, Google, Mustache,
             QUIAjax, QUILocale) {
    "use strict";

    var lg = 'quiqqer/authgoogle';

    return new Class({

        Extends: QUIControl,
        Type   : 'package/quiqqer/authgoogle/bin/controls/Settings',

        Binds: [
            '$onInject',
            '$onResize',
            '$showAccountInfo',
            'setInfoText',
            '$showConnectionInfo'
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
                html   : '<div class="quiqqer-auth-google-settings-info"></div>' +
                    '<div class="quiqqer-auth-google-settings-btns"></div>'
            });

            this.$InfoElm = this.$Elm.getElement(
                '.quiqqer-auth-google-settings-info'
            );

            this.$BtnsElm = this.$Elm.getElement(
                '.quiqqer-auth-google-settings-btns'
            );

            this.Loader.inject(this.$Elm);

            return this.$Elm;
        },

        /**
         * Event: onInject
         */
        $onInject: function () {
            var self   = this;
            var userId = this.getAttribute('uid');

            this.Loader.show();

            var ShowApiError = function () {
                self.Loader.hide();
                self.$InfoElm.set(
                    'html',
                    QUILocale.get(lg, 'controls.settings.api_error')
                );
            };

            // check if user is allowed to edit google account connection
            QUIAjax.get(
                'package_quiqqer_authgoogle_ajax_isEditUserSessionUser',
                function (result) {
                    if (!result) {
                        self.$Elm.set(
                            'html',
                            QUILocale.get(lg, 'controls.settings.wrong.user.info')
                        );

                        self.Loader.hide();

                        self.fireEvent('loaded', [self]);
                        return;
                    }

                    Google.getAccountByQuiqqerUserId(userId).then(function (Account) {
                        self.Loader.hide();

                        if (!Account) {
                            self.$showConnectionInfo().then(function () {
                                self.fireEvent('loaded', [self]);
                            }, ShowApiError);
                            return;
                        }

                        self.$showAccountInfo(Account).then(function () {
                            self.fireEvent('loaded', [self]);
                        }, ShowApiError);
                    });
                }, {
                    'package': 'quiqqer/authgoogle',
                    userId   : userId
                }
            );

            Google.addEvents({
                'onLogin': function () {
                    self.$showConnectionInfo();
                }
            });
        },

        /**
         * Show info of connected google account
         *
         * @param {Object} Account - Data of connected Google account
         * @return {Promise}
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

            var userId = this.getAttribute('uid');

            new QUIButton({
                'class'  : 'quiqqer-auth-google-settings-btn',
                textimage: 'fa fa-unlink',
                text     : QUILocale.get(lg, 'controls.settings.showAccountInfo.btn.disconnect'),
                events   : {
                    onClick: function (Btn) {
                        self.Loader.show();

                        Google.disconnectQuiqqerAccount(
                            userId
                        ).then(function (success) {
                            self.Loader.hide();

                            if (success) {
                                Btn.destroy();
                                self.$showConnectionInfo();
                                self.fireEvent('accountDisconnected', [userId, self]);
                            }
                        });
                    }
                }
            }).inject(
                this.$Elm
            );

            return Promise.resolve();
        },

        /**
         * Show info on how to connect a google account
         *
         * @return {Promise}
         */
        $showConnectionInfo: function () {
            var self = this;

            this.Loader.show();

            this.$BtnsElm.set('html', '');

            let idToken;

            return Google.authenticate().then((token) => {
                idToken = token;
                return Google.getProfileInfo(token);
            }).then((Profile) => {
                self.setInfoText(
                    QUILocale.get(
                        lg,
                        'controls.settings.addAccount.info.connected', {
                            'name' : Profile.name,
                            'email': Profile.email
                        }
                    )
                );

                // "Connect account" Button
                new QUIButton({
                    'class'  : 'quiqqer-auth-google-settings-btn',
                    textimage: 'fa fa-link',
                    text     : QUILocale.get(lg, 'controls.settings.addAccount.btn.connect'),
                    events   : {
                        onClick: function () {
                            self.Loader.show();

                            Google.connectQuiqqerAccount(
                                self.getAttribute('uid'),
                                idToken
                            ).then(function (Account) {
                                self.Loader.hide();

                                if (!Account) {
                                    return;
                                }

                                self.$showAccountInfo(Account);
                                self.fireEvent('accountConnected', [Account, self]);
                            });
                        }
                    }
                }).inject(self.$BtnsElm);

                self.Loader.hide();
            });
        },

        /**
         * Set information text
         *
         * @param {string} text
         */
        setInfoText: function (text) {
            this.$InfoElm.set('html', text);
        }
    });
});