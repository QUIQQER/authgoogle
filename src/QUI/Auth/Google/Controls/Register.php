<?php

/**
 * This file contains QUI\Auth\Google\Controls\Register
 */

namespace QUI\Auth\Google\Controls;

use QUI;
use QUI\Control;

/**
 * Class Register
 *
 * Google Registration Control
 *
 * @package QUI\Auth\Google
 */
class Register extends Control
{
    /**
     * @return string
     */
    public function getBody()
    {
        return '<div class="quiqqer-auth-google-register"     
                  data-qui="package/quiqqer/authgoogle/bin/controls/Register">
            </div>';
    }
}
