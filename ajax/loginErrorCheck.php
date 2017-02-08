<?php

/**
 * Checks the maximum login attempts for Facebook authentication
 * and destroys the session if the threshold is reached
 *
 * @return bool - true = session destroyed; false = session still active
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_loginErrorCheck',
    function () {
        $Session         = QUI::getSession();
        $loginErrorCount = $Session->get('facebook_login_errors');
        $maxLoginErrors  = QUI::getPackage('quiqqer/authgoogle')->getConfig()->get('authSettings', 'maxLoginErrors');

        if (empty($loginErrorCount)) {
            $loginErrorCount = 0;
        }

        $loginErrorCount++;

        if ($loginErrorCount >= (int)$maxLoginErrors) {
            QUI::getMessagesHandler()->addAttention(
                QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.ajax.loginErrorCheck.force.logout.attention'
                )
            );

            $Session->destroy();

            return true;
        }

        $Session->set('facebook_login_errors', $loginErrorCount);

        return false;
    }
);
