<?php

/**
 * Checks the maximum login attempts for Google authentication
 * and destroys the session if the threshold is reached
 *
 * @return bool - true = session destroyed; false = session still active
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_loginAttemptsCheck',
    function () {
        $Session         = QUI::getSession();
        $loginErrorCount = $Session->get('google_login_errors');
        $maxLoginErrors  = QUI::getPackage('quiqqer/authgoogle')->getConfig()->get('authSettings', 'maxLoginErrors');

        if (empty($loginErrorCount)) {
            $loginErrorCount = 0;
        }

        $loginErrorCount++;

        if ($loginErrorCount >= (int)$maxLoginErrors) {
            QUI::getMessagesHandler()->addAttention(
                QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.ajax.loginAttemptsCheck.force.logout.attention'
                )
            );

            $Session->destroy();

            return true;
        }

        $Session->set('google_login_errors', $loginErrorCount);

        return false;
    }
);
