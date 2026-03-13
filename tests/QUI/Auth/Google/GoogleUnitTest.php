<?php

namespace QUITests\Auth\Google;

use Google_Client;
use PHPUnit\Framework\TestCase;
use QUI;
use QUI\Auth\Google\Google;
use QUI\Exception;
use ReflectionClass;

class GoogleUnitTest extends TestCase
{
    private string $originalClientId = '';
    private string $originalClientKey = '';

    protected function setUp(): void
    {
        parent::setUp();

        $Config = QUI::getPackage('quiqqer/authgoogle')->getConfig();

        if (!$Config) {
            $this->markTestSkipped('Package config is not available.');
        }

        $this->originalClientId = (string)$Config->get('apiSettings', 'clientId');
        $this->originalClientKey = (string)$Config->get('apiSettings', 'clientKey');

        $this->setGoogleApi(null);
    }

    protected function tearDown(): void
    {
        $Config = QUI::getPackage('quiqqer/authgoogle')->getConfig();

        if ($Config) {
            $Config->set('apiSettings', 'clientId', $this->originalClientId);
            $Config->set('apiSettings', 'clientKey', $this->originalClientKey);
            $Config->save();
        }

        $this->setGoogleApi(null);

        parent::tearDown();
    }

    public function testTableReturnsResolvedDatabaseTableName(): void
    {
        $this->assertSame(
            QUI::getDBTableName(Google::TBL_ACCOUNTS),
            Google::table()
        );
    }

    public function testClientCredentialsAreReadFromPackageConfig(): void
    {
        $Config = QUI::getPackage('quiqqer/authgoogle')->getConfig();
        $Config->set('apiSettings', 'clientId', 'unit-test-client-id');
        $Config->set('apiSettings', 'clientKey', 'unit-test-client-key');
        $Config->save();

        $this->assertSame('unit-test-client-id', Google::getClientId());
        $this->assertSame('unit-test-client-key', $this->invokeProtectedStaticMethod(Google::class, 'getClientKey'));
    }

    public function testValidateAccessTokenAcceptsMatchingAudience(): void
    {
        $Config = QUI::getPackage('quiqqer/authgoogle')->getConfig();
        $Config->set('apiSettings', 'clientId', 'expected-client-id');
        $Config->save();

        $Api = $this->createMock(Google_Client::class);
        $Api->expects($this->once())
            ->method('verifyIdToken')
            ->with('valid-token')
            ->willReturn([
                'aud' => 'expected-client-id',
                'sub' => 'google-user-id',
                'email' => 'user@example.com'
            ]);

        $this->setGoogleApi($Api);

        Google::validateAccessToken('valid-token');
    }

    public function testValidateAccessTokenRejectsInvalidAudience(): void
    {
        $Config = QUI::getPackage('quiqqer/authgoogle')->getConfig();
        $Config->set('apiSettings', 'clientId', 'expected-client-id');
        $Config->save();

        $Api = $this->createMock(Google_Client::class);
        $Api->expects($this->once())
            ->method('verifyIdToken')
            ->with('invalid-token')
            ->willReturn([
                'aud' => 'different-client-id',
                'sub' => 'google-user-id'
            ]);

        $this->setGoogleApi($Api);

        $this->expectException(Exception::class);
        Google::validateAccessToken('invalid-token');
    }

    public function testGetProfileDataReturnsPayloadFromApi(): void
    {
        $payload = [
            'aud' => 'client-id',
            'sub' => 'google-user-id',
            'email' => 'user@example.com',
            'name' => 'Google User'
        ];

        $Api = $this->createMock(Google_Client::class);
        $Api->expects($this->once())
            ->method('verifyIdToken')
            ->with('profile-token')
            ->willReturn($payload);

        $this->setGoogleApi($Api);

        $this->assertSame($payload, Google::getProfileData('profile-token'));
    }

    public function testGetConnectedAccountByQuiqqerUserIdReturnsEmptyArrayForUnknownUser(): void
    {
        $this->assertSame([], Google::getConnectedAccountByQuiqqerUserId('unit-test-missing-user'));
    }

    private function setGoogleApi(?Google_Client $Api): void
    {
        $Reflection = new ReflectionClass(Google::class);
        $Property = $Reflection->getProperty('Api');
        $Property->setValue(null, $Api);
    }

    private function invokeProtectedStaticMethod(string $className, string $methodName): mixed
    {
        $Reflection = new ReflectionClass($className);
        $Method = $Reflection->getMethod($methodName);

        return $Method->invoke(null);
    }
}
