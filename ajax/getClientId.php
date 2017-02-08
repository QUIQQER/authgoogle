<?php

use QUI\Auth\Google\Google;

/**
 * Get Google API Client-ID
 *
 * @return string - Client-ID
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_getClientId',
    function () {
        return Google::getClientId();
    }
);
