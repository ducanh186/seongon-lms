<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->withSqliteLegacyAlterTable(function (): void {
            Schema::table('user_records', function (Blueprint $table) {
                // UC-15 postcondition: history stores who performed the change.
                $table->foreignId('changed_by')->nullable()->after('reason')->constrained('users')->nullOnDelete();
            });
        });
    }

    public function down(): void
    {
        $this->withSqliteLegacyAlterTable(function (): void {
            Schema::table('user_records', function (Blueprint $table) {
                $table->dropConstrainedForeignId('changed_by');
            });
        });
    }

    /**
     * SQLite cannot add or drop a foreign key in place, so Laravel recreates the table
     * (create __temp__ -> copy -> drop -> rename). The rename step fails on SQLite >= 3.25
     * because the guard_users_history trigger (2026_09_10_000003) references user_records,
     * which is momentarily gone. legacy_alter_table skips that re-parse; the trigger is valid
     * again once the table is renamed back. No-op on MySQL.
     */
    private function withSqliteLegacyAlterTable(callable $callback): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            $callback();

            return;
        }

        DB::statement('PRAGMA legacy_alter_table = ON');

        try {
            $callback();
        } finally {
            DB::statement('PRAGMA legacy_alter_table = OFF');
        }
    }
};
