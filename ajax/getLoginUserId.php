<?php

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
