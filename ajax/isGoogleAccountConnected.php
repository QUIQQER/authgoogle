<?php

use QUI\Auth\Google\Google;

/**
 * Check if a Google account is connected to a QUIQQER user account
 *
 * @param int $googleUserId - Google User ID
 * @return array|false - Details to connected Google account
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_isGoogleAccountConnected',
    function ($idToken) {
        $connectedAccount = Google::getConnectedAccountByGoogleIdToken($idToken);
        return !empty($connectedAccount);
    },
    array('idToken')
);
