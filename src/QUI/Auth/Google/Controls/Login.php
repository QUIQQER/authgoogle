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

        $this->addCSSFile(dirname(__FILE__).'/Login.css');
    }

    /**
     * @return string
     */
    public function getBody()
    {
        $Engine = QUI::getTemplateManager()->getEngine();
        $Conf   = QUI::getPackage('quiqqer/authgoogle')->getConfig();

        $Engine->assign([
            'autoLogin' => boolval($Conf->get('authSettings', 'autoLogin')) ? "1" : "0"
        ]);

        return $Engine->fetch(dirname(__FILE__).'/Login.html');
    }
}
