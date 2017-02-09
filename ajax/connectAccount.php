<?php

use QUI\Auth\Google\Google;

/**
 * Connect QUIQQER account with Google account
 *
 * @param int $userId - QUIQQER user id
 * @param string $idToken - Google API id_token
 * @return array - connection account data
 *
 * @throws QUI\Permissions\Exception
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_connectAccount',
    function ($userId, $idToken) {
        $userId = (int)$userId;

        try {
            Google::connectQuiqqerAccount($userId, $idToken);
            $accountData = Google::getConnectedAccountByQuiqqerUserId($userId);
        } catch (QUI\Auth\Facebook\Exception $Exception) {
            QUI::getMessagesHandler()->addError(
                QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.ajax.connectAccount.error',
                    array(
                        'error' => $Exception->getMessage()
                    )
                )
            );

            return false;
        } catch (\Exception $Exception) {
            QUI\System\Log::addError(
                'AJAX :: package_quiqqer_authgoogle_ajax_connectAccount -> ' . $Exception->getMessage()
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
                'message.ajax.connectAccount.success',
                array(
                    'account'   => $accountData['name'] . ' (' . $accountData['email'] . ')',
                    'qUserName' => QUI::getUsers()->get($accountData['userId'])->getUsername(),
                    'qUserId'   => $accountData['userId']
                )
            )
        );

        return $accountData;
    },
    array('userId', 'idToken')
);
