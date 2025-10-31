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
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);

        $this->setJavaScriptControl('package/quiqqer/authgoogle/bin/controls/Login');
        $this->addCSSClass('quiqqer-google-login');
        $this->setAttribute('icon', 'fa fa-google');

        $cssFile = OPT_DIR . 'quiqqer/authgoogle/bin/classes/Google.css';

        if (file_exists($cssFile)) {
            $this->addCSSFile($cssFile);
        }
    }

    /**
     * @return string
     */
    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();
        return $Engine->fetch(dirname(__FILE__) . '/Login.html');
    }
}
