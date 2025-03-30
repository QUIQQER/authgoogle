<?php

namespace QUI\Auth\Google;

use QUI;
use QUI\Database\Exception;
use QUI\Users\User;

/**
 * Class Events
 */
class Events
{
    /**
     * quiqqer/quiqqer: onUserDelete
     *
     * @param User $User
     * @return void
     *
     * @throws Exception
     * @throws \QUI\Permissions\Exception
     */
    public static function onUserDelete(User $User): void
    {
        Google::disconnectAccount($User->getUUID(), false);
    }

    public static function onQuiqqerMigrationV2(QUI\System\Console\Tools\MigrationV2 $Console): void
    {
        $Console->writeLn('- Migrate google auth');
        $table = Google::table();

        QUI::getDatabase()->execSQL(
            'ALTER TABLE `' . $table . '` CHANGE `userId` `userId` VARCHAR(50) NOT NULL;'
        );

        QUI\Utils\MigrationV1ToV2::migrateUsers(
            $table,
            ['userId'],
            'userId'
        );
    }
}
