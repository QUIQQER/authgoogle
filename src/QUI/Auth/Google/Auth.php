<?php

namespace QUI\Auth\Google;

use QUI;
use QUI\Users\AbstractAuthenticator;
use QUI\Users\User;
use QUI\Auth\Google\Exception as GoogleException;

/**
 * Class Auth
 *
 * Authentication handler for Google authentication
 *
 * @package QUI\Authe\Google2Fa
 */
class Auth extends AbstractAuthenticator
{
    /**
     * User that is to be authenticated
     *
     * @var User
     */
    protected $User = null;

    /**
     * Auth Constructor.
     *
     * @param string|array|integer $user - name of the user, or user id
     */
    public function __construct($user = '')
    {
        if (!empty($user)) {
            $this->User = QUI::getUsers()->getUserByName($user);
        }
    }

    /**
     * @param null|\QUI\Locale $Locale
     * @return string
     */
    public function getTitle($Locale = null)
    {
        if (is_null($Locale)) {
            $Locale = QUI::getLocale();
        }

        return $Locale->get('quiqqer/authgoogle', 'authgoogle.title');
    }

    /**
     * @param null|\QUI\Locale $Locale
     * @return string
     */
    public function getDescription($Locale = null)
    {
        if (is_null($Locale)) {
            $Locale = QUI::getLocale();
        }

        return $Locale->get('quiqqer/authgoogle', 'authgoogle.description');
    }

    /**
     * Authenticate the user
     *
     * @param string|array|integer $authData
     *
     * @throws QUI\Auth\Google\Exception
     */
    public function auth($authData)
    {
        if (!is_array($authData)
            || !isset($authData['token'])
        ) {
            throw new GoogleException(array(
                'quiqqer/authgoogle',
                'exception.auth.wrong.data'
            ), 401);
        }

        $token = $authData['token'];

        try {
            Google::validateAccessToken($token);
        } catch (GoogleException $Exception) {
            throw new GoogleException(array(
                'quiqqer/authgoogle',
                'exception.auth.wrong.data'
            ), 401);
        }

        $connectionProfile = Google::getConnectedAccountByGoogleIdToken($token);

        if (empty($connectionProfile)) {
            throw new GoogleException(array(
                'quiqqer/authgoogle',
                'exception.auth.no.account.connected'
            ), 1001);
        }

        // if there is no user set, Google is used as primary login
        // and Login user is the user connected to the Google profile
        // used in the login process.
        if (is_null($this->User)) {
            $this->User = QUI::getUsers()->get($connectionProfile['userId']);
        }

        if ((int)$connectionProfile['userId'] !== (int)$this->User->getId()) {
            throw new GoogleException(array(
                'quiqqer/authgoogle',
                'exception.auth.wrong.account.for.user'
            ), 401);
        }
    }

    /**
     * Return the user object
     *
     * @return \QUI\Interfaces\Users\User
     */
    public function getUser()
    {
        return $this->User;
    }

    /**
     * Return the quiqqer user id
     *
     * @return integer|boolean
     */
    public function getUserId()
    {
        return $this->User->getId();
    }

    /**
     * @return \QUI\Control
     */
    public static function getLoginControl()
    {
        return new QUI\Auth\Google\Controls\Login();
    }

    /**
     * @return \QUI\Control
     */
    public static function getRegisterControl()
    {
        return new QUI\Auth\Google\Controls\Register();
    }

    /**
     * @return \QUI\Control
     */
    public static function getSettingsControl()
    {
        return new QUI\Auth\Google\Controls\Settings();
    }

    /**
     * @return \QUI\Control
     */
    public static function getPasswordResetControl()
    {
        return null;
    }
}
