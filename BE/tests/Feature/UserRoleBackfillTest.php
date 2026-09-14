<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * P0 step D1 — expand phase for Users -> Roles.
 *
 * RefreshDatabase runs migrations only, never seeders, so these tests also prove
 * that migration correctness does not depend on RoleSeeder having been run.
 */
it('provisions the canonical roles from the migration alone', function () {
    expect(Role::query()->pluck('code')->sort()->values()->all())
        ->toBe(['admin', 'student']);
});

it('backfills role_id for a student created through the factory', function () {
    $user = User::factory()->create();

    expect($user->role)->toBe('student')
        ->and($user->role_id)->toBe(Role::query()->where('code', 'student')->value('id'));
});

it('backfills role_id for an admin created through the factory', function () {
    $user = User::factory()->admin()->create();

    expect($user->role)->toBe('admin')
        ->and($user->role_id)->toBe(Role::query()->where('code', 'admin')->value('id'));
});

it('resolves role_id when users.role falls back to the column default', function () {
    // AuthController::register() creates a user without setting role.
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Nguyễn Văn A',
        'email' => 'a@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertCreated();

    $user = User::query()->where('email', 'a@example.com')->firstOrFail();

    expect($user->role)->toBe('student')
        ->and($user->role_id)->toBe(Role::query()->where('code', 'student')->value('id'));
});

it('keeps role_id in sync when the legacy role changes', function () {
    $user = User::factory()->create();

    $user->role = 'admin';
    $user->save();

    expect($user->fresh()->role_id)->toBe(Role::query()->where('code', 'admin')->value('id'));
});

it('keeps the legacy role in sync when role_id changes', function () {
    $user = User::factory()->create();

    $user->role_id = Role::query()->where('code', 'admin')->value('id');
    $user->save();

    expect($user->fresh()->role)->toBe('admin');
});

it('leaves no user without a resolved role', function () {
    User::factory()->count(5)->create();
    User::factory()->admin()->create();

    expect(DB::table('users')->whereNull('role_id')->count())->toBe(0);
});

it('exposes the role relation alongside the legacy column', function () {
    $user = User::factory()->admin()->create();

    expect($user->role()->first()->code)->toBe('admin')
        // The legacy string column still shadows the relation accessor by design.
        ->and($user->role)->toBe('admin');
});
