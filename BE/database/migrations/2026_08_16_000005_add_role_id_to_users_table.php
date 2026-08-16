<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P0 step D1 — expand phase for the approved ERD Users -> Roles relationship.
 *
 * Expand only: users.role_id is added and backfilled while the legacy users.role
 * string is preserved. Neither the NOT NULL constraint nor the drop of users.role
 * happens here; both belong to the contract phase, once no deployed code writes
 * users.role on its own.
 *
 * Migration correctness must not depend on any seeder having been run, so the
 * canonical roles are provisioned here rather than by RoleSeeder.
 */
return new class extends Migration
{
    /**
     * Codes match the values stored in the legacy users.role enum, so the backfill
     * is a direct code -> id lookup with no remapping.
     */
    private const CANONICAL_ROLES = [
        ['code' => 'admin', 'name' => 'Quản trị viên', 'description' => 'Quản trị hệ thống và nội dung đào tạo.'],
        ['code' => 'student', 'name' => 'Học viên', 'description' => 'Người mua và tham gia khóa học.'],
    ];

    public function up(): void
    {
        DB::transaction(fn () => $this->ensureCanonicalRolesExist());

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->constrained()->restrictOnDelete();
        });

        DB::transaction(function () {
            $this->backfillRoleIdFromLegacyRole();
            $this->assertEveryUserResolvesToARole();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });
    }

    /**
     * Idempotent: existing rows are left untouched so a re-run cannot clobber
     * customised names or descriptions.
     */
    private function ensureCanonicalRolesExist(): void
    {
        $now = now();

        foreach (self::CANONICAL_ROLES as $role) {
            if (DB::table('roles')->where('code', $role['code'])->exists()) {
                continue;
            }

            DB::table('roles')->insert($role + ['created_at' => $now, 'updated_at' => $now]);
        }
    }

    /**
     * One UPDATE per role rather than an UPDATE ... JOIN, which MySQL and SQLite
     * do not share a syntax for.
     */
    private function backfillRoleIdFromLegacyRole(): void
    {
        foreach (DB::table('roles')->get(['id', 'code']) as $role) {
            DB::table('users')
                ->where('role', $role->code)
                ->update(['role_id' => $role->id]);
        }
    }

    private function assertEveryUserResolvesToARole(): void
    {
        $unresolved = DB::table('users')->whereNull('role_id')->count();

        if ($unresolved === 0) {
            return;
        }

        $codes = DB::table('users')
            ->whereNull('role_id')
            ->distinct()
            ->pluck('role')
            ->map(fn ($code) => $code ?? 'NULL')
            ->implode(', ');

        throw new RuntimeException(
            "Backfill incomplete: {$unresolved} user(s) have no matching role. Unmapped users.role value(s): {$codes}."
        );
    }
};
