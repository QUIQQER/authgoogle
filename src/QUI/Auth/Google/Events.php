<?php

namespace QUI\Auth\Google;

use QUI;
use QUI\Database\Exception;
use QUI\Users\User;
use Doctrine\DBAL\Schema\Column;
use Doctrine\DBAL\Schema\ColumnDiff;
use Doctrine\DBAL\Schema\TableDiff;
use Doctrine\DBAL\Types\Type;

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
     * @throws QUI\Permissions\Exception
     */
    public static function onUserDelete(User $User): void
    {
        Google::disconnectAccount($User->getUUID(), false);
    }

    /**
     * @throws Exception
     * @throws \Doctrine\DBAL\Exception
     */
    public static function onQuiqqerMigrationV2(QUI\System\Console\Tools\MigrationV2 $Console): void
    {
        $Console->writeLn('- Migrate google auth');
        $table = Google::table();

        $SchemaManager = QUI::getSchemaManager();

        if ($SchemaManager->tablesExist([$table])) {
            $Table = $SchemaManager->introspectTable($table);

            if ($Table->hasColumn('userId')) {
                $CurrentColumn = $Table->getColumn('userId');
                $TargetColumn = new Column(
                    'userId',
                    Type::getType('string'),
                    ['length' => 50, 'notnull' => true]
                );

                $SchemaManager->alterTable(new TableDiff(
                    $Table,
                    changedColumns: [
                        'userId' => new ColumnDiff($CurrentColumn, $TargetColumn)
                    ]
                ));
            }
        }

        QUI\Utils\MigrationV1ToV2::migrateUsers(
            $table,
            ['userId'],
            'userId'
        );
    }
}
