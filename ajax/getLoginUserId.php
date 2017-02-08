<?php

use QUI;
use PragmaRX\Google2FA\Google2FA;
use QUI\Utils\Security\Orthos;
use QUI\Security;
use QUI\Auth\Google2Fa\Auth;

/**
 * Get ID of the user that tries to log in
 *
 * @return int|false - user id or false if no login user set
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_getLoginUserId',
    function () {
        return QUI::getSession()->get('uid');
    }
);
