/**
 * QUIQQER account registration via Google Account
 *
 * @module package/quiqqer/authgoogle/bin/frontend/controls/Registrar
 */
define('package/quiqqer/authgoogle/bin/frontend/controls/Registrar', [

    'qui/controls/Control',
    'package/quiqqer/frontend-users/bin/frontend/controls/login/Login',
    'package/quiqqer/authgoogle/bin/Google'

], function (QUIControl, QUILogin, Google) {
    "use strict";

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/authgoogle/bin/frontend/controls/Registrar',

        Binds: [
            '$onImport'
        ],

        initialize: function (options) {
            this.parent(options);

            this.addEvents({
                onImport: this.$onImport
            });

            this.$ButtonContainer = null;
            this.$Elm = null;
            this.$Form = null;
        },

        /**
         * Event: onImport
         */
        $onImport: function () {
            this.$Elm = this.getElm();

            const RegistrarForm = this.$Elm.getElement('.quiqqer-authgoogle-registrar-form');

            if (!RegistrarForm) {
                return;
            }

            RegistrarForm.removeClass('quiqqer-authgoogle__hidden');

            this.$Form = this.$Elm.getParent('form');
            this.$ButtonContainer = this.$Elm.getElement('.quiqqer-authgoogle-registrar-btn');

            this.$Form.addEvent('submit', function (event) {
                event.stop();
            });

            Google.getButton().inject(this.$ButtonContainer);
        }
    });
});
