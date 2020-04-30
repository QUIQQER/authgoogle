<?php

/**
 * This file contains QUI\Registration\Google\Registrar
 */

namespace QUI\Registration\Google;

use QUI;

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

        $control = 'package/quiqqer/authgoogle/bin/frontend/controls/Registrar';

        if (QUI::getPackageManager()->isInstalled('quiqqer/gdpr')) {
            $control = 'package/quiqqer/authgoogle/bin/frontend/controls/GdprRegistrar';
        }

        $this->setJavaScriptControl($control);
    }

    /**
     * @return string
     */
    public function getBody()
    {
        $Engine = QUI::getTemplateManager()->getEngine();

        $Engine->assign('isAuth', boolval(QUI::getUserBySession()->getId()));

        return $Engine->fetch(dirname(__FILE__) . '/Control.html');
    }
}
