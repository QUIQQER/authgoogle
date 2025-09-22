/**
 * Google Authentication for QUIQQER
 *
 * @module package/quiqqer/authgoogle/bin/controls/Login
 */
define('package/quiqqer/authgoogle/bin/controls/Login', [
    'qui/controls/Control',
    'package/quiqqer/authgoogle/bin/Google'
], function (QUIControl, Google) {
    "use strict";

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/authgoogle/bin/controls/Login',

        Binds: [
            '$onImport'
        ],

        initialize: function (options) {
            this.parent(options);

            this.addEvents({
                onImport: this.$onImport
            });
        },

        /**
         * event on DOMElement creation
         */
        create: function () {
            this.$Elm = new Element('div', {
                'class': 'quiqqer-auth-google-login'
            });

            Google.getButton().inject(this.$Elm);

            return this.$Elm;
        },

        $onImport: function () {
            let container = this.$Elm;

            if (container.nodeName === 'INPUT') {
                container = container.getParent('.quiqqer-auth-google-login');
            }

            const button = container.querySelector('button');
            const googleButton = Google.getButton();
            const node = googleButton.create();

            if (button) {
                button.replaceWith(node);
            } else {
                googleButton.inject(container);
            }
        }
    });
});
