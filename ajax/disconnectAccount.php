<?php

use QUI\Auth\Google\Google;

/**
 * Disconnect QUIQQER account from Google account
 *
 * @param int $userId - QUIQQER user id
 * @return bool - success
 *
 * @throws QUI\Permissions\Exception
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_disconnectAccount',
    function ($userId) {
        $userId = (int)$userId;

        try {
            Google::disconnectAccount($userId);
        } catch (QUI\Auth\Google\Exception $Exception) {
            QUI::getMessagesHandler()->addError(
                QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.ajax.disconnectAccount.error',
                    [
                        'error' => $Exception->getMessage()
                    ]
                )
            );

            return false;
        } catch (\Exception $Exception) {
            QUI\System\Log::addError(
                'AJAX :: package_quiqqer_authgoogle_ajax_disconnectAccount -> '.$Exception->getMessage()
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
                    'qUserId'   => $userId
                ]
            )
        );

        return true;
    },
    ['userId'],
    'Permission::checkAdminUser'
);
