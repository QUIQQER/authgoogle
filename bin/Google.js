/**
 * Main controller for Google JavaScript API
 */
define('package/quiqqer/authgoogle/bin/Google', [
    'package/quiqqer/authgoogle/bin/classes/Google'
], function (GoogleClass) {
    "use strict";
    return new GoogleClass();
});