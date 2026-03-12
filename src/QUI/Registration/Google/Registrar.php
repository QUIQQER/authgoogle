<?php

/**
 * This file contains QUI\Registration\Google\Registrar
 */

namespace QUI\Registration\Google;

use QUI;
use QUI\Auth\Google\Google;
use QUI\Database\Exception;
use QUI\ExceptionStack;
use QUI\FrontendUsers;
use QUI\FrontendUsers\Handler as FrontendUsersHandler;
use QUI\FrontendUsers\InvalidFormField;
use QUI\Interfaces\Users\User;

/**
 * Class Email\Registrar
 *
 * Registration via e-mail address
 *
 * @package QUI\Registration\Google
 */
class Registrar extends FrontendUsers\AbstractRegistrar
{
    private ?array $profileData = null;

    /**
     * Registrar constructor.
     */
    public function __construct()
    {
        $this->setAttribute('icon-css-class', 'google-registrar');
    }

    /**
     * @return array<string, mixed>
     *
     * @throws QUI\Exception
     */
    private function getProfileDataFromToken(): array
    {
        if (!is_null($this->profileData)) {
            return $this->profileData;
        }

        $token = $this->getAttribute('token');
        Google::validateAccessToken($token);
        $this->profileData = Google::getProfileData($token);

        return $this->profileData;
    }

    /**
     * @return QUI\Interfaces\Users\User
     *
     * @throws Exception
     * @throws QUI\Exception
     * @throws ExceptionStack
     * @throws QUI\Permissions\Exception
     */
    public function createUser(): QUI\Interfaces\Users\User
    {
        $SystemUser = QUI::getUsers()->getSystemUser();
        $RegistrarHandler = QUI\FrontendUsers\Handler::getInstance();
        $registrationSettings = $RegistrarHandler->getRegistrationSettings();
        $useAddress = boolval($registrationSettings['addressInput']);
        $token = $this->getAttribute('token');
        $profileData = $this->getProfileDataFromToken();

        if (Google::existsQuiqqerAccount($token)) {
            $connectionProfile = Google::getConnectedAccountByGoogleIdToken($token);

            return QUI::getUsers()->get($connectionProfile['userId']);
        }

        $User = parent::createUser();

        if (!empty($profileData['email'])) {
            $User->setAttribute('email', $profileData['email']);
        }

        if (!empty($profileData['given_name'])) {
            $User->setAttribute('firstname', $profileData['given_name']);
        }

        if (!empty($profileData['family_name'])) {
            $User->setAttribute('lastname', $profileData['family_name']);
        }

        if ($useAddress && !empty($profileData['email'])) {
            $Address = $User->getStandardAddress();
            $Address->editMail(0, $profileData['email']);

            if (!empty($profileData['given_name'])) {
                $Address->setAttribute('firstname', $profileData['given_name']);
            }

            if (!empty($profileData['family_name'])) {
                $Address->setAttribute('lastname', $profileData['family_name']);
            }

            $Address->save($SystemUser);
            $User->setAttribute('address', $Address->getUUID());
        }

        $User->setAttribute(FrontendUsersHandler::USER_ATTR_EMAIL_VERIFIED, boolval($profileData['email_verified']));
        $User->setPassword(QUI\Security\Password::generateRandom(), $SystemUser);
        $User->save($SystemUser);

        Google::connectQuiqqerAccount($User->getUUID(), $token, false);

        return $User;
    }

    public function onRegistered(QUI\Interfaces\Users\User $User): void
    {
    }

    /**
     * Return the success message
     * @return string
     */
    public function getSuccessMessage(): string
    {
        $registrarSettings = $this->getSettings();

        switch ($registrarSettings['activationMode']) {
            case FrontendUsers\Handler::ACTIVATION_MODE_MANUAL:
                $msg = QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.registrar.registration_success_manual'
                );
                break;

            case FrontendUsers\Handler::ACTIVATION_MODE_AUTO:
                $msg = QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.registrar.registration_success_auto'
                );
                break;

            case FrontendUsers\Handler::ACTIVATION_MODE_MAIL:
                $msg = QUI::getLocale()->get(
                    'quiqqer/authgoogle',
                    'message.registrar.registration_success_mail'
                );
                break;

            default:
                return parent::getPendingMessage();
        }

        return $msg;
    }

    /**
     * Return pending message
     * @return string
     */
    public function getPendingMessage(): string
    {
        return QUI::getLocale()->get(
            'quiqqer/authgoogle',
            'message.registrar.registration_pending'
        );
    }

    /**
     * @throws FrontendUsers\Exception|QUI\Permissions\Exception|QUI\Exception
     */
    public function validate(): array
    {
        $lg = 'quiqqer/authgoogle';
        $lgPrefix = 'exception.registrar.';

        $token = $this->getAttribute('token');

        if (empty($token)) {
            throw new FrontendUsers\Exception([
                $lg,
                $lgPrefix . 'token_invalid'
            ]);
        }

        try {
            $profileData = $this->getProfileDataFromToken();
        } catch (\Exception) {
            throw new FrontendUsers\Exception([
                $lg,
                $lgPrefix . 'token_invalid'
            ]);
        }

        $email = $this->getUsername();

        if (empty($email)) {
            throw new FrontendUsers\Exception([
                $lg,
                $lgPrefix . 'email_address_empty'
            ]);
        }

        if (QUI::getUsers()->usernameExists($email)) {
            // check if google connection ist already there, then we don't need to throw an error
            if (!Google::existsQuiqqerAccount($token)) {
                throw new FrontendUsers\Exception([
                    $lg,
                    $lgPrefix . 'email_already_exists'
                ]);
            }
        }

        $settings = $this->getRegistrationSettings();

        if (
            !(int)$settings['allowUnverifiedEmailAddresses']
            && !(int)$profileData['email_verified']
        ) {
            throw new FrontendUsers\Exception([
                $lg,
                $lgPrefix . 'email_not_verified'
            ]);
        }

        return $profileData;
    }

    /**
     * Get all invalid registration form fields
     *
     * @return InvalidFormField[]
     */
    public function getInvalidFields(): array
    {
        // Registration via Google account does not use form fields
        return [];
    }

    /**
     * @return string
     * @throws QUI\Permissions\Exception
     */
    public function getUsername(): string
    {
        $userData = $this->getProfileDataFromToken();

        if (!empty($userData['email'])) {
            return $userData['email'];
        }

        return '';
    }

    /**
     * @return Control
     */
    public function getControl(): QUI\Control
    {
        return new Control();
    }

    /**
     * Get title
     *
     * @param QUI\Locale|null $Locale (optional) - If omitted use QUI::getLocale()
     * @return string
     */
    public function getTitle(?QUI\Locale $Locale = null): string
    {
        if (is_null($Locale)) {
            $Locale = QUI::getLocale();
        }

        return $Locale->get('quiqqer/authgoogle', 'registrar.title');
    }

    /**
     * Get description
     *
     * @param QUI\Locale|null $Locale (optional) - If omitted use QUI::getLocale()
     * @return string
     */
    public function getDescription(?QUI\Locale $Locale = null): string
    {
        if (is_null($Locale)) {
            $Locale = QUI::getLocale();
        }

        return $Locale->get('quiqqer/authgoogle', 'registrar.description');
    }

    /**
     * @return string
     */
    public function getIcon(): string
    {
        return 'fa fa-brands fa-google';
    }

    /**
     * Get registration settings for this plugin
     *
     * @return array<string, mixed>
     * @throws QUI\Exception
     */
    protected function getRegistrationSettings(): array
    {
        if (!QUI::getPackage('quiqqer/authgoogle')->getConfig()) {
            return [];
        }

        return QUI::getPackage('quiqqer/authgoogle')->getConfig()->getSection('registration');
    }

    /**
     * Check if this Registrar can send passwords
     *
     * @return bool
     */
    public function canSendPassword(): bool
    {
        return true;
    }
}
