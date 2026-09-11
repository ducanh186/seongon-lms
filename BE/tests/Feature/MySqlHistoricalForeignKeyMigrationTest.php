<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MySqlHistoricalForeignKeyMigrationTest extends TestCase
{
    public function test_mysql_migration_handles_canonical_information_schema_column_names(): void
    {
        $statements = [];

        DB::shouldReceive('getDriverName')
            ->once()
            ->andReturn('mysql');
        DB::shouldReceive('select')
            ->times(14)
            ->andReturnUsing(static function (string $query): array {
                $resultColumn = preg_match('/\bCONSTRAINT_NAME\s+AS\s+([a-z_][a-z0-9_]*)/i', $query, $matches)
                    ? $matches[1]
                    : 'CONSTRAINT_NAME';

                return [(object) [$resultColumn => 'existing_foreign_key']];
            });
        DB::shouldReceive('statement')
            ->times(28)
            ->andReturnUsing(static function (string $statement) use (&$statements): bool {
                $statements[] = $statement;

                return true;
            });

        $migration = require database_path('migrations/2026_09_10_000003_protect_historical_foreign_keys.php');
        $migration->up();

        $this->assertCount(28, $statements);
        $this->assertSame(
            'alter table `orders` drop foreign key `existing_foreign_key`',
            $statements[0],
        );
        $this->assertSame(
            'alter table `orders` add constraint `orders_user_id_historical_fk` foreign key (`user_id`) references `users` (`id`) on delete restrict',
            $statements[1],
        );
    }
}
