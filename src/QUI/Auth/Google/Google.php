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
     * Currently used version of Google API
     *
     * Version list:
     * https://developers.facebook.com/docs/apps/changelog
     *
     * @var string
     */
    const GRAPH_VERSION = 'v2.8';

    /**
     * Google API Object
     *
     * @var GoogleApi
     */
    protected static $Api = null;

    /**
     * Create a new QUIQQER account with a Google email address
     *
     * @param string $email - Google email address
     * @param string $accessToken - Google access token
     * @return QUI\Users\User - Newly created user
     *
     * @throws QUI\Auth\Google\Exception
     */
    public static function createQuiqqerAccount($email, $accessToken)
    {
        $Users = QUI::getUsers();

        if ($Users->emailExists($email)) {
            throw new Exception(array(
                'quiqqer/authgoogle',
                'exception.google.email.already.exists',
                array(
                    'email' => $email
                )
            ));
        }

        self::validateAccessToken($accessToken);

        $profileData = self::getProfileData($accessToken);

        if (!isset($profileData['email'])) {
            throw new Exception(array(
                'quiqqer/authgoogle',
                'exception.google.email.access.mandatory'
            ));
        }

        if ($profileData['email'] != $email) {
            throw new Exception(array(
                'quiqqer/authgoogle',
                'exception.google.email.incorrect'
            ));
        }

        $NewUser = $Users->createChild($email, $Users->getSystemUser());
        $NewUser->setAttribute('email', $email);
        $NewUser->save($Users->getSystemUser());
        $NewUser->setPassword(Orthos::getPassword(), $Users->getSystemUser()); // set random password
        $NewUser->activate(false, $Users->getSystemUser());

        // automatically connect new quiqqer account with google account
        QUI::getSession()->set('uid', $NewUser->getId());   // temporarily set uid for permission reasons
        self::connectQuiqqerAccount($NewUser->getId(), $accessToken);
        QUI::getSession()->set('uid', false);

        return $NewUser;
    }

    /**
     * Connect a QUIQQER account with a Google account
     *
     * @param int $uid
     * @param string $accessToken
     * @return void
     *
     * @throws QUI\Auth\Google\Exception
     */
    public static function connectQuiqqerAccount($uid, $accessToken)
    {
        self::checkEditPermission($uid);

        $User = QUI::getUsers()->get($uid);

        if (self::isQuiqqerAcccountConnected($uid)) {
            throw new Exception(array(
                'quiqqer/authgoogle',
                'exception.google.account.already.connected',
                array(
                    'userId'   => $uid,
                    'userName' => $User->getUsername()
                )
            ));
        }

        self::validateAccessToken($accessToken);

        $profileData = self::getProfileData($accessToken);

        QUI::getDataBase()->insert(
            QUI::getDBTableName(self::TBL_ACCOUNTS),
            array(
                'userId'       => $User->getId(),
                'googleUserId' => $profileData['sub'],
                'email'        => $profileData['email'],
                'name'         => $profileData['name']
            )
        );
    }

    /**
     * Disconnect Google account from QUIQQER account
     *
     * @param int $userId - QUIQQER User ID
     */
    public static function disconnectAccount($userId)
    {
        self::checkEditPermission($userId);

        QUI::getDataBase()->delete(
            QUI::getDBTableName(self::TBL_ACCOUNTS),
            array(
                'userId' => (int)$userId,
            )
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
            throw new Exception(array(
                'quiqqer/authgoogle',
                'exception.google.invalid.token'
            ));
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
        $result = QUI::getDataBase()->fetch(array(
            'from'  => QUI::getDBTableName(self::TBL_ACCOUNTS),
            'where' => array(
                'userId' => (int)$userId
            )
        ));

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

        $result  = QUI::getDataBase()->fetch(array(
            'from'  => QUI::getDBTableName(self::TBL_ACCOUNTS),
            'where' => array(
                'googleUserId' => $profile['sub']
            )
        ));

        if (empty($result)) {
            return false;
        }

        return current($result);
    }

    /**
     * Checks if a quiqqer account is already connected to a Google account
     *
     * @param int $userId - QUIQQER User ID
     * @return bool
     */
    public static function isQuiqqerAcccountConnected($userId)
    {
        $accountData = self::getConnectedAccountByQuiqqerUserId($userId);
        return !empty($accountData);
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
            self::$Api = new GoogleApi(array(
                'client_id'     => self::getClientId(),
//                'client_secret' => self::getClientKey()
            ));
        } catch (\Exception $Exception) {
            QUI\System\Log::addError(
                self::class . ' :: getApi() -> ' . $Exception->getMessage()
            );

            throw new Exception(array(
                'quiqqer/authgoogle',
                'exception.google.api.error'
            ));
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
