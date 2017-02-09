<?php

use QUI\Auth\Google\Google;
use QUI\Utils\Security\Orthos;

/**
 * Create QUIQQER account with Google email adress
 *
 * @param string $email - Google email address
 * @param string $idToken - Google id_token
 * @return array - connection account data
 *
 * @throws QUI\Permissions\Exception
 * @throws QUI\Auth\Google\Exception
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_createAccount',
    function ($email, $idToken) {
        $email = Orthos::clear($email);

        try {
            $NewUser = Google::createQuiqqerAccount($email, $idToken);
        } catch (QUI\Auth\Google\Exception $Exception) {
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
    array('email', 'idToken')
);
