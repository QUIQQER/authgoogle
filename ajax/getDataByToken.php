<?php

/**
 * Check if a Google account is connected to a QUIQQER user account
 *
 * @param int $googleUserId - Google User ID
 * @return array|false - Details to connected Google account
 */

use QUI\Auth\Google\Google;

QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_getDataByToken',
    function ($idToken) {
        return Google::getProfileData($idToken);
    },
    ['idToken']
);
