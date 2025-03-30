<?php

namespace QUI\Auth\Google;

use Google_Client as GoogleApi;
use QUI;
use QUI\ExceptionStack;
use QUI\Permissions\Exception;

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
     * @var null|GoogleApi
     */
    protected static ?GoogleApi $Api = null;

    public static function table(): string
    {
        return QUI::getDBTableName(self::TBL_ACCOUNTS);
    }

    /**
     * Connect a QUIQQER account with a Google account
     *
     * @param int|string $uid
     * @param string $accessToken
     * @param bool $checkPermission (optional) - check permission to edit quiqqer account [default: true]
     * @return void
     *
     * @throws QUI\Database\Exception
     * @throws QUI\Exception
     * @throws ExceptionStack
     * @throws Exception
     */
    public static function connectQuiqqerAccount(
        int | string $uid,
        string $accessToken,
        bool $checkPermission = true
    ): void {
        if ($checkPermission !== false) {
            self::checkEditPermission($uid);
        }

        $User = QUI::getUsers()->get($uid);
        $profileData = self::getProfileData($accessToken);

        if (self::existsQuiqqerAccount($accessToken)) {
            throw new Exception([
                'quiqqer/authgoogle',
                'exception.google.account_already_connected',
                ['email' => $profileData['email']]
            ]);
        }

        self::validateAccessToken($accessToken);

        QUI::getDataBase()->insert(
            QUI::getDBTableName(self::TBL_ACCOUNTS),
            [
                'userId' => $User->getUUID(),
                'googleUserId' => $profileData['sub'],
                'email' => $profileData['email'],
                'name' => $profileData['name']
            ]
        );

        $User->enableAuthenticator(
            Auth::class,
            QUI::getUsers()->getSystemUser()
        );
    }

    /**
     * Disconnect Google account from QUIQQER account
     *
     * @param int|string $userId - QUIQQER User ID
     * @param bool $checkPermission (optional) [default: true]
     * @return void
     *
     * @throws Exception
     * @throws QUI\Database\Exception
     */
    public static function disconnectAccount(int | string $userId, bool $checkPermission = true): void
    {
        if ($checkPermission !== false) {
            self::checkEditPermission($userId);
        }

        try {
            $User = QUI::getUsers()->get($userId);
            $userId = $User->getUUID();
            $userUuid = $User->getUUID();
        } catch (QUI\Exception) {
        }

        QUI::getDataBase()->delete(
            QUI::getDBTableName(self::TBL_ACCOUNTS),
            ['userId' => $userId]
        );

        QUI::getDataBase()->delete(
            QUI::getDBTableName(self::TBL_ACCOUNTS),
            ['userId' => $userUuid]
        );
    }

    /**
     * Checks if a Google API access token is valid and if the user has provided
     * the necessary information (email)
     *
     * @param string $accessToken
     * @return void
     *
     * @throws Exception
     */
    public static function validateAccessToken(string $accessToken): void
    {
        $payload = self::getApi()->verifyIdToken($accessToken);

        if (
            empty($payload)
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
     * @throws Exception
     */
    public static function getProfileData(string $accessToken): array
    {
        return self::getApi()->verifyIdToken($accessToken);
    }

    /**
     * Get details of a connected Google account
     *
     * @param int|string $userId - QUIQQER User ID
     * @return array|false - details as array or false if no account connected to given QUIQQER User account ID
     */
    public static function getConnectedAccountByQuiqqerUserId(int | string $userId): bool | array
    {
        $result = QUI::getDataBase()->fetch([
            'from' => QUI::getDBTableName(self::TBL_ACCOUNTS),
            'where' => [
                'userId' => $userId
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
     *
     * @throws Exception
     * @throws QUI\Database\Exception|\QUI\Auth\Google\Exception
     */
    public static function getConnectedAccountByGoogleIdToken(string $idToken): bool | array
    {
        self::validateAccessToken($idToken);

        $profile = self::getProfileData($idToken);

        $result = QUI::getDataBase()->fetch([
            'from' => QUI::getDBTableName(self::TBL_ACCOUNTS),
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
     *
     * @throws Exception
     * @throws QUI\Database\Exception
     */
    public static function existsQuiqqerAccount(string $token): bool
    {
        $profile = self::getProfileData($token);

        $result = QUI::getDataBase()->fetch([
            'from' => QUI::getDBTableName(self::TBL_ACCOUNTS),
            'where' => [
                'googleUserId' => $profile['sub']
            ],
            'limit' => 1
        ]);

        if (empty($result)) {
            return false;
        }

        $userId = $result[0]['userId'];

        if (empty($userId)) {
            return false;
        }

        try {
            $user = QUI::getUsers()->get($userId);
        } catch (QUI\Exception) {
            return false;
        }

        try {
            $user->getAuthenticator(Auth::class);
            return true;
        } catch (QUI\Exception) {
        }

        try {
            // add authenticator
            $user->enableAuthenticator(Auth::class, QUI::getUsers()->getSystemUser());
        } catch (QUI\Exception) {
            return false;
        }

        return true;
    }

    /**
     * Get Google API Instance
     *
     * @return GoogleApi|null
     * @throws Exception
     */
    protected static function getApi(): ?GoogleApi
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
                self::class . ' :: getApi() -> ' . $Exception->getMessage()
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
    public static function getClientId(): string
    {
        return QUI::getPackage('quiqqer/authgoogle')->getConfig()->get('apiSettings', 'clientId');
    }

    /**
     * Get Client Key for Google API
     *
     * @return string
     */
    protected static function getClientKey(): string
    {
        return QUI::getPackage('quiqqer/authgoogle')->getConfig()->get('apiSettings', 'clientKey');
    }

    /**
     * Checks if the session user is allowed to edit the Google account connection to
     * the given QUIQQER user account ID
     *
     * @param int|string $userId - QUIQQER User ID
     * @return void
     *
     * @throws Exception
     */
    protected static function checkEditPermission(int | string $userId): void
    {
        if (QUI::getUserBySession()->getUUID() === QUI::getUsers()->getSystemUser()->getUUID()) {
            return;
        }

        if (QUI::getSession()->get('uid') !== $userId || !$userId) {
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
