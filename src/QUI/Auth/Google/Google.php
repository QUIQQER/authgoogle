<?php

namespace QUI\Auth\Google;

use QUI;
use QUI\Utils\Security\Orthos;
use Google_Client as GoogleApi;

/**
 * Class Google
 *
 * Google Graph API
 *
 * @package QUI\Auth\Google
 */
class Google
{
    const TBL_ACCOUNTS = 'quiqqer_auth_google';

    /**
     * Google API Object
     *
     * @var GoogleApi
     */
    protected static $Api = null;

    /**
     * Connect a QUIQQER account with a Google account
     *
     * @param int $uid
     * @param string $accessToken
     * @param bool $checkPermission (optional) - check permission to edit quiqqer account [default: true]
     * @return void
     *
     * @throws QUI\Auth\Google\Exception
     */
    public static function connectQuiqqerAccount($uid, $accessToken, $checkPermission = true)
    {
        if ($checkPermission !== false) {
            self::checkEditPermission($uid);
        }

        $User        = QUI::getUsers()->get($uid);
        $profileData = self::getProfileData($accessToken);

        if (self::existsQuiqqerAccount($accessToken)) {
            throw new Exception([
                'quiqqer/authgoogle',
                'exception.google.account_already_connected',
                [
                    'email' => $profileData['email']
                ]
            ]);
        }

        self::validateAccessToken($accessToken);

        QUI::getDataBase()->insert(
            QUI::getDBTableName(self::TBL_ACCOUNTS),
            [
                'userId'       => $User->getId(),
                'googleUserId' => $profileData['sub'],
                'email'        => $profileData['email'],
                'name'         => $profileData['name']
            ]
        );
    }

    /**
     * Disconnect Google account from QUIQQER account
     *
     * @param int $userId - QUIQQER User ID
     * @param bool $checkPermission (optional) [default: true]
     * @return void
     */
    public static function disconnectAccount($userId, $checkPermission = true)
    {
        if ($checkPermission !== false) {
            self::checkEditPermission($userId);
        }

        QUI::getDataBase()->delete(
            QUI::getDBTableName(self::TBL_ACCOUNTS),
            [
                'userId' => (int)$userId,
            ]
        );
    }

    /**
     * Checks if a Google API access token is valid and if the user has provided
     * the necessary information (email)
     *
     * @param string $accessToken
     * @return void
     *
     * @throws QUI\Auth\Google\Exception
     */
    public static function validateAccessToken($accessToken)
    {
        $payload = self::getApi()->verifyIdToken($accessToken);

        if (empty($payload)
            || !isset($payload['aud'])
            || $payload['aud'] != self::getClientId()
        ) {
            throw new Exception([
                'quiqqer/authgoogle',
                'exception.google.invalid.token'
            ]);
        }
    }

    /**
     * Get Google Profile data
     *
     * @param string $accessToken - access token
     * @return array
     */
    public static function getProfileData($accessToken)
    {
        return self::getApi()->verifyIdToken($accessToken);
    }

    /**
     * Get details of a connected Google account
     *
     * @param int $userId - QUIQQER User ID
     * @return array|false - details as array or false if no account connected to given QUIQQER User account ID
     */
    public static function getConnectedAccountByQuiqqerUserId($userId)
    {
        $result = QUI::getDataBase()->fetch([
            'from'  => QUI::getDBTableName(self::TBL_ACCOUNTS),
            'where' => [
                'userId' => (int)$userId
            ]
        ]);

        if (empty($result)) {
            return false;
        }

        return current($result);
    }

    /**
     * Get details of a connected Google account
     *
     * @param string $idToken - Google API id_token
     * @return array|false - details as array or false if no account connected to given Google userID
     */
    public static function getConnectedAccountByGoogleIdToken($idToken)
    {
        self::validateAccessToken($idToken);

        $profile = self::getProfileData($idToken);

        $result = QUI::getDataBase()->fetch([
            'from'  => QUI::getDBTableName(self::TBL_ACCOUNTS),
            'where' => [
                'googleUserId' => $profile['sub']
            ]
        ]);

        if (empty($result)) {
            return false;
        }

        return current($result);
    }

    /**
     * Checks if a QUIQQER account exists for a given access token
     *
     * @param string $token - Google API access token
     * @return bool
     */
    public static function existsQuiqqerAccount($token)
    {
        $profile = self::getProfileData($token);

        $result = QUI::getDataBase()->fetch([
            'from'  => QUI::getDBTableName(self::TBL_ACCOUNTS),
            'where' => [
                'googleUserId' => $profile['sub']
            ],
            'limit' => 1
        ]);

        return !empty($result);
    }

    /**
     * Get Google API Instance
     *
     * @return GoogleApi
     * @throws Exception
     */
    protected static function getApi()
    {
        if (!is_null(self::$Api)) {
            return self::$Api;
        }

        try {
            self::$Api = new GoogleApi([
                'client_id' => self::getClientId(),
//                'client_secret' => self::getClientKey()
            ]);
        } catch (\Exception $Exception) {
            QUI\System\Log::addError(
                self::class.' :: getApi() -> '.$Exception->getMessage()
            );

            throw new Exception([
                'quiqqer/authgoogle',
                'exception.google.api.error'
            ]);
        }

        return self::$Api;
    }

    /**
     * Get Client-ID for Google API
     *
     * @return string
     */
    public static function getClientId()
    {
        return QUI::getPackage('quiqqer/authgoogle')->getConfig()->get('apiSettings', 'clientId');
    }

    /**
     * Get Client Key for Google API
     *
     * @return string
     */
    protected static function getClientKey()
    {
        return QUI::getPackage('quiqqer/authgoogle')->getConfig()->get('apiSettings', 'clientKey');
    }

    /**
     * Checks if the session user is allowed to edit the Google account connection to
     * the given QUIQQER user account ID
     *
     * @param int $userId - QUIQQER User ID
     * @return void
     *
     * @throws QUI\Permissions\Exception
     */
    protected static function checkEditPermission($userId)
    {
        if (QUI::getUserBySession()->getId() === QUI::getUsers()->getSystemUser()->getId()) {
            return;
        }

        if ((int)QUI::getSession()->get('uid') !== (int)$userId
            || !$userId
        ) {
            throw new QUI\Permissions\Exception(
                QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'exception.operation.only.allowed.by.own.user'
                ),
                401
            );
        }
    }
}
