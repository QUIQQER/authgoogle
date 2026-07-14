<?php

namespace QUITests\Auth\Google\Integration;

use PHPUnit\Framework\TestCase;
use QUI;
use QUI\Auth\Google\Google;
use Throwable;

class DatabaseAccessTest extends TestCase
{
    private ?string $userUuid = null;

    protected function setUp(): void
    {
        parent::setUp();

        if (!QUI::getSchemaManager()->tablesExist([Google::table()])) {
            self::markTestSkipped('The Google authentication database table is not installed.');
        }
    }

    protected function tearDown(): void
    {
        if ($this->userUuid !== null) {
            try {
                QUI::getDataBaseConnection()->delete(
                    QUI\Utils\Doctrine::quoteIdentifier(Google::table()),
                    [QUI\Utils\Doctrine::quoteIdentifier('userId') => $this->userUuid]
                );

                QUI::getUsers()->deleteUser($this->userUuid);
            } catch (Throwable) {
            }
        }

        parent::tearDown();
    }

    public function testNumericUserIdLookupAndDisconnectUseStoredUuid(): void
    {
        $Users = QUI::getUsers();
        $SystemUser = $Users->getSystemUser();
        $suffix = bin2hex(random_bytes(8));
        $username = 'phpunit-authgoogle-' . $suffix;

        try {
            $User = $Users->createChildWithAttributes([
                'username' => $username,
                'email' => $username . '@example.invalid',
                'firstname' => 'Google',
                'lastname' => 'DBAL'
            ], $SystemUser);
        } catch (Throwable $Exception) {
            self::markTestSkipped('No usable super-user fixture is available: ' . $Exception->getMessage());
        }

        $userId = $User->getId();

        if ($userId === false) {
            self::fail('The Google DBAL test user has no numeric ID.');
        }

        $this->userUuid = $User->getUUID();
        $googleUserId = 'phpunit-google-sub-' . $suffix;

        QUI::getDataBaseConnection()->insert(
            QUI\Utils\Doctrine::quoteIdentifier(Google::table()),
            [
                QUI\Utils\Doctrine::quoteIdentifier('userId') => $this->userUuid,
                QUI\Utils\Doctrine::quoteIdentifier('googleUserId') => $googleUserId,
                QUI\Utils\Doctrine::quoteIdentifier('email') => $username . '@example.invalid',
                QUI\Utils\Doctrine::quoteIdentifier('name') => 'Google DBAL'
            ]
        );

        $account = Google::getConnectedAccountByQuiqqerUserId($userId);

        self::assertSame($this->userUuid, $account['userId'] ?? null);
        self::assertSame($googleUserId, $account['googleUserId'] ?? null);

        Google::disconnectAccount($userId, false);

        self::assertSame([], Google::getConnectedAccountByQuiqqerUserId($userId));
    }
}
