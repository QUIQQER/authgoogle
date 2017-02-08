<?php

use QUI\Auth\Google\Google;

/**
 * Check if a facebook account is connected to a QUIQQER user account
 *
 * @param int $userId - QUIQQER User ID
 * @return array|false - Details to connected Facebook account
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_getAccountByQuiqqerUserId',
    function ($userId) {
        if ((int)QUI::getSession()->get('uid') !== (int)$userId) {
            throw new QUI\Permissions\Exception(
                QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'exception.operation.only.allowed.by.own.user'
                ),
                401
            );
        }

        return Google::getConnectedAccountByQuiqqerUserId($userId);
    },
    array('userId')
);
