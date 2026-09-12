<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** UC-16 Publish / Hide branch: HIDDEN is a state of its own, distinct from DRAFT. */
    public function up(): void
    {
        $this->withSqliteLegacyAlterTable(function (): void {
            Schema::table('courses', function (Blueprint $table) {
                $table->enum('status', ['draft', 'published', 'hidden'])->default('draft')->change();
            });
        });
    }

    public function down(): void
    {
        DB::table('courses')->where('status', 'hidden')->update(['status' => 'draft']);
        $this->withSqliteLegacyAlterTable(function (): void {
            Schema::table('courses', function (Blueprint $table) {
                $table->enum('status', ['draft', 'published'])->default('draft')->change();
            });
        });
    }

    /**
     * SQLite implements enum ->change() by recreating the table (create __temp__ -> copy ->
     * drop -> rename). The rename step fails on SQLite >= 3.25 because the guard_courses_history
     * trigger (2026_09_10_000003) is defined BEFORE DELETE ON courses and gets re-validated while
     * the table is momentarily gone. legacy_alter_table skips that re-parse; the trigger is valid
     * again once the table is renamed back. No-op on MySQL, which uses a plain MODIFY.
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
