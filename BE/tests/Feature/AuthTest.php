<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

it('accepts a profile avatar upload through multipart method spoofing', function () {
    Storage::fake('public');
    $user = User::factory()->create();
    $avatar = UploadedFile::fake()->image('avatar.png', 200, 200);

    $response = $this->actingAs($user, 'sanctum')->post('/api/v1/auth/profile', [
        '_method' => 'PUT',
        'name' => 'Nguyễn Văn B',
        'phone' => '0900000000',
        'avatar_file' => $avatar,
    ]);

    $response->assertOk()->assertJsonPath('data.name', 'Nguyễn Văn B');
    $path = $response->json('data.avatar');
    expect($path)->toStartWith('/storage/profile-avatars/');
    Storage::disk('public')->assertExists(str_replace('/storage/', '', $path));
});
