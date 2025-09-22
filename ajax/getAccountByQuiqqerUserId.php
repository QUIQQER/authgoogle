<?php

/**
 * Check if a Google account is connected to a QUIQQER user account
 *
 * @param int $userId - QUIQQER User ID
 * @return array|false - Details to connected Google account
 */

use QUI\Auth\Google\Google;

QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_getAccountByQuiqqerUserId',
    function ($userId) {
        if (QUI::getSession()->get('uid') !== $userId) {
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
    ['userId']
);
