<?php

/**
 * This file contains QUI\Registration\Google\Registrar
 */

namespace QUI\Registration\Google;

use QUI;
use QUI\Countries\Controls\Select as CountrySelect;

/**
 * Class Control
 *
 * @package QUI\Registration\Google
 */
class Control extends QUI\Control
{
    /**
     * Control constructor.
     *
     * @param array $attributes
     */
    public function __construct(array $attributes = array())
    {
        parent::__construct($attributes);

        $this->addCSSFile(dirname(__FILE__) . '/Control.css');
        $this->addCSSClass('quiqqer-authgoogle-registrar');
        $this->setJavaScriptControl('package/quiqqer/authgoogle/bin/frontend/controls/Registrar');
    }

    /**
     * @return string
     */
    public function getBody()
    {
        $Engine = QUI::getTemplateManager()->getEngine();
        return $Engine->fetch(dirname(__FILE__) . '/Control.html');
    }
}
