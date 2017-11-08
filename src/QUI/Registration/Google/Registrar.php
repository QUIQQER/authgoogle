<?php

/**
 * This file contains QUI\Registration\Google\Registrar
 */

namespace QUI\Registration\Google;

use QUI;
use QUI\FrontendUsers;
use QUI\FrontendUsers\InvalidFormField;
use QUI\Auth\Google\Google;
use QUI\FrontendUsers\Handler as FrontendUsersHandler;

/**
 * Class Email\Registrar
 *
 * Registration via e-mail address
 *
 * @package QUI\Registration\Google
 */
class Registrar extends FrontendUsers\AbstractRegistrar
{
    /**
     * @param QUI\Interfaces\Users\User $User
     * @return int
     */
    public function onRegistered(QUI\Interfaces\Users\User $User)
    {
        $Handler    = FrontendUsers\Handler::getInstance();
        $settings   = $Handler->getRegistrarSettings($this->getType());
        $SystemUser = QUI::getUsers()->getSystemUser();
        $token      = $this->getAttribute('token');

        // set user data
        $profileData = Google::getProfileData($token);

        $User->setAttributes(array(
            'email'     => $profileData['email'],
            'firstname' => empty($profileData['given_name']) ? null : $profileData['given_name'],
            'lastname'  => empty($profileData['family_name']) ? null : $profileData['family_name'],
        ));

        $User->setAttribute(FrontendUsersHandler::USER_ATTR_EMAIL_VERIFIED, boolval($profileData['email_verified']));

        $User->setPassword(QUI\Security\Password::generateRandom(), $SystemUser);
        $User->save($SystemUser);

        // connect Google account with QUIQQER account
        Google::connectQuiqqerAccount($User->getId(), $token, false);

        $returnStatus = $Handler::REGISTRATION_STATUS_SUCCESS;

        switch ($settings['activationMode']) {
            case $Handler::ACTIVATION_MODE_MAIL:
                $Handler->sendActivationMail($User, $this);
                $returnStatus = $Handler::REGISTRATION_STATUS_PENDING;
                break;

            case $Handler::ACTIVATION_MODE_AUTO:
                $User->activate(false, $SystemUser);
                break;
        }

        return $returnStatus;
    }

    /**
     * Return the success message
     * @return string
     */
    public function getSuccessMessage()
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
    public function getPendingMessage()
    {
        return QUI::getLocale()->get(
            'quiqqer/authgoogle',
            'message.registrar.registration_pending'
        );
    }

    /**
     * @throws FrontendUsers\Exception
     */
    public function validate()
    {
        $lg       = 'quiqqer/authgoogle';
        $lgPrefix = 'exception.registrar.';

        $token = $this->getAttribute('token');

        if (empty($token)) {
            throw new FrontendUsers\Exception(array(
                $lg,
                $lgPrefix . 'token_invalid'
            ));
        }

        try {
            Google::validateAccessToken($token);
        } catch (\Exception $Exception) {
            throw new FrontendUsers\Exception(array(
                $lg,
                $lgPrefix . 'token_invalid'
            ));
        }

        $email = $this->getUsername();

        if (empty($email)) {
            throw new FrontendUsers\Exception(array(
                $lg,
                $lgPrefix . 'email_address_empty'
            ));
        }

        if (QUI::getUsers()->usernameExists($email)) {
            throw new FrontendUsers\Exception(array(
                $lg,
                $lgPrefix . 'email_already_exists'
            ));
        }

        $settings    = $this->getRegistrationSettings();
        $profileData = Google::getProfileData($token);

        if (!(int)$settings['allowUnverifiedEmailAddresses']
            && !(int)$profileData['email_verified']) {
            throw new FrontendUsers\Exception(array(
                $lg,
                $lgPrefix . 'email_not_verified'
            ));
        }
    }

    /**
     * Get all invalid registration form fields
     *
     * @return InvalidFormField[]
     */
    public function getInvalidFields()
    {
        // Registration via Google account does not use form fields
        return array();
    }

    /**
     * @return string
     */
    public function getUsername()
    {
        $userData = Google::getProfileData($this->getAttribute('token'));

        if (!empty($userData['email'])) {
            return $userData['email'];
        }

        return '';
    }

    /**
     * @return Control
     */
    public function getControl()
    {
        return new Control();
    }

    /**
     * Get title
     *
     * @param QUI\Locale $Locale (optional) - If omitted use QUI::getLocale()
     * @return string
     */
    public function getTitle($Locale = null)
    {
        if (is_null($Locale)) {
            $Locale = QUI::getLocale();
        }

        return $Locale->get('quiqqer/authgoogle', 'registrar.title');
    }

    /**
     * Get description
     *
     * @param QUI\Locale $Locale (optional) - If omitted use QUI::getLocale()
     * @return string
     */
    public function getDescription($Locale = null)
    {
        if (is_null($Locale)) {
            $Locale = QUI::getLocale();
        }

        return $Locale->get('quiqqer/authgoogle', 'registrar.description');
    }

    /**
     * Get registration settings for this plugin
     *
     * @return array
     */
    protected function getRegistrationSettings()
    {
        return QUI::getPackage('quiqqer/authgoogle')->getConfig()->getSection('registration');
    }
}
