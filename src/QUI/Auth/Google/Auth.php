<?php

/**
 * This file contains QUI\Auth\Google\Auth
 */

namespace QUI\Auth\Google;

use QUI;
use QUI\Auth\Google\Exception as GoogleException;
use QUI\Control;
use QUI\Database\Exception;
use QUI\Locale;
use QUI\Users\AbstractAuthenticator;

use function is_string;

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
     */
    protected QUI\Interfaces\Users\User | null $User = null;

    /**
     * Auth Constructor.
     *
     * @param string|array|integer $user - name of the user, or user id
     */
    public function __construct(mixed $user = '')
    {
        if (!empty($user) && is_string($user)) {
            try {
                $this->User = QUI::getUsers()->getUserByName($user);
            } catch (\Exception) {
                $this->User = QUI::getUsers()->getNobody();
            }
        }
    }

    /**
     * @param null|Locale $Locale
     * @return string
     */
    public function getTitle(null | QUI\Locale $Locale = null): string
    {
        if (is_null($Locale)) {
            $Locale = QUI::getLocale();
        }

        return $Locale->get('quiqqer/authgoogle', 'authgoogle.title');
    }

    /**
     * @param null|Locale $Locale
     * @return string
     */
    public function getDescription(null | QUI\Locale $Locale = null): string
    {
        if (is_null($Locale)) {
            $Locale = QUI::getLocale();
        }

        return $Locale->get('quiqqer/authgoogle', 'authgoogle.description');
    }

    /**
     * Authenticate the user
     *
     * @param array|integer|string $authParams
     *
     * @throws Exception
     * @throws QUI\Permissions\Exception|\QUI\Auth\Google\Exception
     */
    public function auth(string | array | int $authParams): void
    {
        if (
            !is_array($authParams)
            || !isset($authParams['token'])
        ) {
            throw new GoogleException([
                'quiqqer/authgoogle',
                'exception.auth.wrong.data'
            ], 401);
        }

        $token = $authParams['token'];

        try {
            Google::validateAccessToken($token);
        } catch (GoogleException) {
            throw new GoogleException([
                'quiqqer/authgoogle',
                'exception.auth.wrong.data'
            ], 401);
        }

        $connectionProfile = Google::getConnectedAccountByGoogleIdToken($token);

        if (empty($connectionProfile)) {
            /**
             * Check if a user with the Facebook e-mail address already exists and if so
             * automatically connect it to the QUIQQER account.
             */
            $userData = Google::getProfileData($token);
            $Users = QUI::getUsers();

            if (!empty($userData['email']) && $Users->emailExists($userData['email'])) {
                try {
                    $User = $Users->getUserByMail($userData['email']);

                    Google::connectQuiqqerAccount($User->getUUID(), $token, false);
                    $connectionProfile = Google::getConnectedAccountByGoogleIdToken($token);
                } catch (\Exception $Exception) {
                    QUI\System\Log::writeException($Exception);

                    throw new GoogleException([
                        'quiqqer/authgoogle',
                        'exception.auth.no.account.connected'
                    ], 1001);
                }
            } else {
                throw new GoogleException([
                    'quiqqer/authgoogle',
                    'exception.auth.no.account.connected'
                ], 1001);
            }
        }

        // if there is no user set, Google is used as primary login
        // and Login user is the user connected to the Google profile
        // used in the login process.
        if (is_null($this->User)) {
            try {
                $this->User = QUI::getUsers()->get($connectionProfile['userId']);
            } catch (QUI\Exception) {
                throw new GoogleException([
                    'quiqqer/authgoogle',
                    'exception.auth.no.account.connected'
                ], 1001);
            }
        }

        if ($connectionProfile['userId'] !== $this->User->getUUID()) {
            throw new GoogleException([
                'quiqqer/authgoogle',
                'exception.auth.wrong.account.for.user'
            ], 401);
        }
    }

    /**
     * Return the user object
     *
     * @return QUI\Interfaces\Users\User
     */
    public function getUser(): QUI\Interfaces\Users\User
    {
        return $this->User;
    }

    /**
     * @return Control|null
     */
    public static function getLoginControl(): ?Control
    {
        return new QUI\Auth\Google\Controls\Login();
    }

    /**
     * @return Control|null
     */
    public static function getSettingsControl(): ?Control
    {
        return new QUI\Auth\Google\Controls\Settings();
    }

    /**
     * @return Control|null
     */
    public static function getPasswordResetControl(): ?Control
    {
        return null;
    }
}
