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
            Schema::table('exams', function (Blueprint $table) {
                $table->timestamp('closes_at')->nullable()->after('duration_minutes');
                $table->integer('max_attempts')->default(2)->change();
            });
        });

        DB::table('exams')->where('max_attempts', 3)->update(['max_attempts' => 2]);
    }

    public function down(): void
    {
        $this->withSqliteLegacyAlterTable(function (): void {
            Schema::table('exams', function (Blueprint $table) {
                $table->integer('max_attempts')->default(3)->change();
                $table->dropColumn('closes_at');
            });
        });
    }

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
