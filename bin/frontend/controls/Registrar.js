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
    'package/quiqqer/frontend-users/bin/frontend/controls/login/Login',
    'package/quiqqer/authgoogle/bin/Google',
    'Ajax',
    'Locale',

    'css!package/quiqqer/authgoogle/bin/frontend/controls/Registrar.css'

], function (QUIControl, QUIPopup, QUILoader, QUILogin, Google, QUIAjax, QUILocale) {
    "use strict";

    const lg = 'quiqqer/authgoogle';
    let registerCount = 0; // register count

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/authgoogle/bin/frontend/controls/Registrar',

        Binds: [
            '$onImport'
        ],

        options: {
            uid: false  // QUIQQER User ID
        },

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
