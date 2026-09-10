<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // The approved Roles table is the source of truth. Expand the legacy
        // compatibility enum so teacher accounts can be persisted on MySQL too.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('student','admin','teacher') NOT NULL DEFAULT 'student'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            $studentRoleId = DB::table('roles')->where('code', 'student')->value('id');
            DB::table('users')->where('role', 'teacher')->update([
                'role' => 'student',
                'role_id' => $studentRoleId,
            ]);
            DB::statement("ALTER TABLE users MODIFY role ENUM('student','admin') NOT NULL DEFAULT 'student'");
        }
    }
};
