<?php

use App\Models\Role;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('does not let a student escalate to admin through the profile endpoint', function () {
    $student = User::factory()->create();
    $adminRoleId = Role::query()->where('code', 'admin')->value('id');

    Sanctum::actingAs($student);

    $this->putJson('/api/v1/auth/profile', [
        'name' => 'Học viên A',
        'role_id' => $adminRoleId,
        'role' => 'admin',
    ])->assertOk();

    $student->refresh();

    expect($student->role)->toBe('student')
        ->and($student->role_id)->toBe(Role::query()->where('code', 'student')->value('id'));
});

it('does not let registration choose a role', function () {
    $adminRoleId = Role::query()->where('code', 'admin')->value('id');

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Nguyễn Văn B',
        'email' => 'b@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role_id' => $adminRoleId,
        'role' => 'admin',
    ])->assertCreated();

    $user = User::query()->where('email', 'b@example.com')->firstOrFail();

    expect($user->role)->toBe('student')
        ->and($user->role_id)->toBe(Role::query()->where('code', 'student')->value('id'));
});
