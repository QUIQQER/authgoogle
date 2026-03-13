<?php

namespace QUITests\Auth\Google;

use PHPUnit\Framework\TestCase;
use QUI;
use QUI\Auth\Google\Auth;
use QUI\Auth\Google\Controls\Login;
use QUI\Locale;

class AuthUnitTest extends TestCase
{
    public function testConstructorWithoutUserReturnsNobody(): void
    {
        $Auth = new Auth();

        $this->assertSame(
            QUI::getUsers()->getNobody()->getUUID(),
            $Auth->getUser()->getUUID()
        );
    }

    public function testConstructorWithUnknownUserFallsBackToNobody(): void
    {
        $Auth = new Auth('unit-test-unknown-user');

        $this->assertSame(
            QUI::getUsers()->getNobody()->getUUID(),
            $Auth->getUser()->getUUID()
        );
    }

    public function testTitleAndDescriptionUseProvidedLocale(): void
    {
        $call = 0;

        $Locale = $this->createMock(Locale::class);
        $Locale->expects($this->exactly(2))
            ->method('get')
            ->willReturnCallback(function (string $package, string $key) use (&$call): string {
                $call++;

                if ($call === 1) {
                    $this->assertSame('quiqqer/authgoogle', $package);
                    $this->assertSame('authgoogle.title', $key);

                    return 'Google title';
                }

                $this->assertSame('quiqqer/authgoogle', $package);
                $this->assertSame('authgoogle.description', $key);

                return 'Google description';
            });

        $Auth = new Auth();

        $this->assertSame('Google title', $Auth->getTitle($Locale));
        $this->assertSame('Google description', $Auth->getDescription($Locale));
    }

    public function testAuthenticatorMetadataAndControls(): void
    {
        $Auth = new Auth();

        $this->assertFalse($Auth->isSecondaryAuthentication());
        $this->assertSame('fa fa-google', $Auth->getIcon());
        $this->assertNull($Auth->getSettingsControl());
        $this->assertNull($Auth->getPasswordResetControl());
        $this->assertInstanceOf(Login::class, Auth::getLoginControl());
    }
}
