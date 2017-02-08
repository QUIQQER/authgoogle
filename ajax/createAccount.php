<?php

use QUI\Auth\Facebook\Facebook;
use QUI\Utils\Security\Orthos;

/**
 * Create QUIQQER account with Facebook email adress
 *
 * @param string $email - Facebook email address
 * @param string $fbToken - Facebook access token
 * @return array - connection account data
 *
 * @throws QUI\Permissions\Exception
 * @throws QUI\Auth\Facebook\Exception
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_createAccount',
    function ($email, $fbToken) {
        $email = Orthos::clear($email);

        try {
            $NewUser = Facebook::createQuiqqerAccount($email, $fbToken);
        } catch (QUI\Auth\Facebook\Exception $Exception) {
            throw $Exception; // throw exception to show it in the frontend
        } catch (\Exception $Exception) {
            QUI\System\Log::addError(
                'AJAX :: package_quiqqer_authgoogle_ajax_createAccount -> ' . $Exception->getMessage()
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
                'message.ajax.createAccount.success',
                array(
                    'email' => $email
                )
            )
        );

        return $NewUser->getId();
    },
    array('email', 'fbToken')
);
