<?php

use QUI\Auth\Facebook\Facebook;

/**
 * Disconnect QUIQQER account from Facebook account
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
            Facebook::disconnectAccount($userId);
        } catch (QUI\Auth\Facebook\Exception $Exception) {
            QUI::getMessagesHandler()->addError(
                QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.ajax.disconnectAccount.error',
                    array(
                        'error' => $Exception->getMessage()
                    )
                )
            );

            return false;
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
                array(
                    'qUserName' => QUI::getUsers()->get($userId)->getUsername(),
                    'qUserId'   => $userId
                )
            )
        );

        return true;
    },
    array('userId'),
    'Permission::checkAdminUser'
);
