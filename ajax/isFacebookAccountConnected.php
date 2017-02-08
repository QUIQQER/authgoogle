<?php

use QUI\Auth\Facebook\Facebook;

/**
 * Check if a facebook account is connected to a QUIQQER user account
 *
 * @param int $fbUserId - Facebook User ID
 * @return array|false - Details to connected Facebook account
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_isFacebookAccountConnected',
    function ($fbUserId) {
        $connectedAccount = Facebook::getConnectedAccountByFacebookUserId($fbUserId);
        return !empty($connectedAccount);
    },
    array('fbUserId')
);
