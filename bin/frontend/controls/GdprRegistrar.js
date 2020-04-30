/**
 * GDPR-compliant QUIQQER account registration via Google Account
 *
 * @module package/quiqqer/authgoogle/bin/frontend/controls/GdprRegistrar
 * @author www.pcsg.de (Jan Wennrich)
 */
define('package/quiqqer/authgoogle/bin/frontend/controls/GdprRegistrar', [

    'package/quiqqer/authgoogle/bin/frontend/controls/Registrar'

], function (GoogleRegistrar) {
    "use strict";

    var lg            = 'quiqqer/authgoogle';
    var registerCount = 0; // register count

    return new Class({

        Extends: GoogleRegistrar,
        Type   : 'package/quiqqer/authgoogle/bin/frontend/controls/GdprRegistrar',

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
         * Event: onImport
         */
        $onImport: function () {
            var self = this;

            // The $onImport function of the parent class
            var parentImportFunction = self.$constructor.parent.prototype.$onImport;

            // If GDPR isn't available or cookies are already accepted there is noting to do here
            if (typeof GDPR === 'undefined' || (
                GDPR.isCookieCategoryAccepted('essential') &&
                GDPR.isCookieCategoryAccepted('preferences') &&
                GDPR.isCookieCategoryAccepted('statistics') &&
                GDPR.isCookieCategoryAccepted('marketing')
            )
            ) {
                // Call the parent $inImport function to initialize Facebook login
                return parentImportFunction.apply(self, arguments);
            }

            this.$Elm = this.getElm();

            var RegistrarForm = this.$Elm.getElement('.quiqqer-authgoogle-registrar-form');

            if (!RegistrarForm) {
                return;
            }

            RegistrarForm.removeClass('quiqqer-authgoogle__hidden');

            this.$Elm.getParent('form').addEvent('submit', function (event) {
                event.stop();
            });

            var RegisterButton = this.$Elm.getElement('.quiqqer-auth-google-registration-btn');

            // Add a click listener to display the GDPR-confirm-popup
            RegisterButton.addEventListener('click', self.$onRegisterButtonClick);

            // Make the register button clickable
            RegisterButton.disabled = false;

            // When the required cookies get accepted...
            GDPR.waitForCookieCategoriesAcceptance([
                'essential',
                'preferences',
                'statistics',
                'marketing'
            ]).then(function () {
                // ...remove the click listener
                RegisterButton.removeEventListener('click', self.$onRegisterButtonClick);

                // ...call the parent $inImport function to initialize Facebook registration
                parentImportFunction.apply(self, arguments);
            });

        },

        $onRegisterButtonClick: function () {
            // Display the GDPR info popup
            require(['package/quiqqer/authgoogle/bin/controls/GdprConfirm'], function (GdprConfirm) {
                var Confirm = new GdprConfirm();
                Confirm.open();
            });
        }
    });
});
