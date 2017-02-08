<?php

/**
 * This file contains
 */
namespace QUI\Auth\Google\Controls;

use QUI;
use QUI\Control;

/**
 * Class Register
 *
 * Facebook Settings Control
 *
 * @package QUI\Auth\Google
 */
class Settings extends Control
{
    /**
     * @return string
     */
    public function getBody()
    {
        return '<div class="quiqqer-auth-google-settings"     
                  data-qui="package/quiqqer/authgoogle/bin/controls/Settings">
            </div>';
    }
}