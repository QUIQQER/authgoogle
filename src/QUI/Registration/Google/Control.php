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
     * @param array<string, mixed> $attributes
     */
    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);

        $this->addCSSFile(dirname(__FILE__) . '/Control.css');
        $this->addCSSClass('quiqqer-authgoogle-registrar');
        $this->setJavaScriptControl('package/quiqqer/authgoogle/bin/frontend/controls/Registrar');
    }

    /**
     * @return string
     */
    public function getBody(): string
    {
        $Engine = QUI::getTemplateManager()->getEngine();

        $Engine->assign('isAuth', boolval(QUI::getUserBySession()->getId()));

        return $Engine->fetch(dirname(__FILE__) . '/Control.html');
    }
}
