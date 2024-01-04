<?php

/**
 * Get Google API Client-ID
 *
 * @return string - Client-ID
 */

use QUI\Auth\Google\Google;

QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_getClientId',
    function () {
        return Google::getClientId();
    }
);
