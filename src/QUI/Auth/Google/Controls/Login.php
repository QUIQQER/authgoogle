<?php

/**
 * This file contains QUI\Auth\Google\Controls\Login
 */

namespace QUI\Auth\Google\Controls;

use QUI;
use QUI\Control;

/**
 * Class Register
 *
 * Google Login Control
 *
 * @package QUI\Auth\Google
 */
class Login extends Control
{
    /**
     * Login constructor.
     *
     * @param array $attributes
     */
    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);

        $this->addCSSClass('quiqqer-google-login');
        $this->addCSSFile(dirname(__FILE__).'/Login.css');
        $this->setAttribute('icon', 'fa fa-google');
    }

    /**
     * @return string
     */
    public function getBody()
    {
        try {
            $Engine = QUI::getTemplateManager()->getEngine();
            $Conf   = QUI::getPackage('quiqqer/authgoogle')->getConfig();
        } catch (QUI\Exception $Exception) {
            return '';
        }

        $Engine->assign([
            'autoLogin' => boolval($Conf->get('authSettings', 'autoLogin')) ? "1" : "0"
        ]);

        return $Engine->fetch(dirname(__FILE__).'/Login.html');
    }
}
