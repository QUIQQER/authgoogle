<?php

use QUI\Auth\Facebook\Facebook;

/**
 * Check if the user that logs in via facebook is the login User
 *
 * @return bool
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_isLoginUserFacebookUser',
    function ($fbToken) {
        $loginUserId = QUI::getSession()->get('uid');

        if (!$loginUserId) {
            return false;
        }

        $profileData = Facebook::getProfileData($fbToken);
        $accountData = Facebook::getConnectedAccountByQuiqqerUserId($loginUserId);

        if (!$accountData) {
            return false;
        }

        if (!isset($profileData['id'])) {
            return false;
        }

        return (int)$profileData['id'] === (int)$accountData['fbUserId'];
    },
    array('fbToken')
);
