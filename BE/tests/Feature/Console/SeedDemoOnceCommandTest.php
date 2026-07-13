<?php

namespace Tests\Feature\Console;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeedDemoOnceCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_demo_data_when_users_table_is_empty(): void
    {
        $this->artisan('app:seed-demo-once')
            ->expectsOutput('Demo data seeded.')
            ->assertSuccessful();

        $this->assertDatabaseHas('users', ['email' => 'admin@seongon.vn']);
        $this->assertDatabaseHas('users', ['email' => 'student@seongon.vn']);
        $this->assertSame(116, User::query()->where('role', 'student')->count());
        $this->assertDatabaseCount('courses', 100);
    }

    public function test_it_skips_demo_seed_when_a_user_already_exists(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $this->artisan('app:seed-demo-once')
            ->expectsOutput('Users already exist; demo seed skipped.')
            ->assertSuccessful();

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseMissing('users', ['email' => 'admin@seongon.vn']);
    }
}
