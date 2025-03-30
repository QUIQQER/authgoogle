<?php

/**
 * Disconnect QUIQQER account from Google account
 *
 * @param int $userId - QUIQQER user id
 * @return bool - success
 *
 * @throws QUI\Permissions\Exception
 */

use QUI\Auth\Google\Google;

QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_disconnectAccount',
    function ($userId) {
        try {
            Google::disconnectAccount($userId);
        } catch (\Exception $Exception) {
            QUI\System\Log::addError(
                'AJAX :: package_quiqqer_authgoogle_ajax_disconnectAccount -> ' . $Exception->getMessage()
            );

            QUI::getMessagesHandler()->addError(
                QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.ajax.general.error'
                )
            );

            return false;
        }

        QUI::getMessagesHandler()->addSuccess(
            QUI::getLocale()->get(
                'quiqqer/authgoogle',
                'message.ajax.disconnectAccount.success',
                [
                    'qUserName' => QUI::getUsers()->get($userId)->getUsername(),
                    'qUserId' => $userId
                ]
            )
        );

        return true;
    },
    ['userId'],
    'Permission::checkAdminUser'
);
