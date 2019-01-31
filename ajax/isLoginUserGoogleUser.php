<?php

use QUI\Auth\Google\Google;

/**
 * Check if the user that logs in via Google is the login User
 *
 * @param string $idToken - Google API ID Token
 * @return bool
 */
QUI::$Ajax->registerFunction(
    'package_quiqqer_authgoogle_ajax_isLoginUserGoogleUser',
    function ($idToken) {
        $loginUserId = QUI::getSession()->get('uid');

        if (!$loginUserId) {
            return false;
        }

        $profileData = Google::getProfileData($idToken);
        $accountData = Google::getConnectedAccountByQuiqqerUserId($loginUserId);

        if (!$accountData) {
            return false;
        }

        if (!isset($profileData['sub'])) {
            return false;
        }

        return (int)$profileData['sub'] === (int)$accountData['googleUserId'];
    },
    ['idToken']
);
