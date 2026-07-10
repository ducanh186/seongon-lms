<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('registers a new student and returns a token', function () {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Nguyen Van A',
        'email' => 'a@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertCreated()->assertJsonStructure(['user' => ['id', 'email', 'role'], 'token']);

    expect(User::where('email', 'a@example.com')->first()->role)->toBe('student');
});

it('logs in with correct credentials', function () {
    User::factory()->create(['email' => 'b@example.com', 'password' => 'secret123']);

    $this->postJson('/api/v1/auth/login', ['email' => 'b@example.com', 'password' => 'secret123'])
        ->assertOk()
        ->assertJsonStructure(['user', 'token']);
});

it('rejects a wrong password', function () {
    User::factory()->create(['email' => 'c@example.com', 'password' => 'secret123']);

    $this->postJson('/api/v1/auth/login', ['email' => 'c@example.com', 'password' => 'wrong'])
        ->assertStatus(422);
});

it('blocks a locked account from logging in', function () {
    User::factory()->locked()->create(['email' => 'd@example.com', 'password' => 'secret123']);

    $this->postJson('/api/v1/auth/login', ['email' => 'd@example.com', 'password' => 'secret123'])
        ->assertStatus(422);
});

it('returns the authenticated user', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.email', $user->email);
});
