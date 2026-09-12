<?php

namespace Tests\Feature\Console;

use App\Models\User;
use Database\Seeders\DemoAccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
        $this->assertSame(117, User::query()->where('role', 'student')->count());
        $this->assertSame(0, DB::table('users')->whereNull('role_id')->count());
        $this->assertDatabaseHas('users', [
            'email' => 'admin@seongon.vn',
            'role_id' => DB::table('roles')->where('code', 'admin')->value('id'),
        ]);
        $this->assertDatabaseCount('courses', 101);
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

    public function test_demo_account_sync_restores_roles_when_an_existing_database_has_no_roles(): void
    {
        DB::table('roles')->delete();
        User::factory()->create(['email' => 'existing@example.com']);

        $this->artisan('app:seed-demo-once')
            ->expectsOutput('Users already exist; demo seed skipped.')
            ->assertSuccessful();

        $this->artisan('db:seed', [
            '--class' => DemoAccountSeeder::class,
            '--force' => true,
        ])->assertSuccessful();

        $this->assertDatabaseHas('roles', ['code' => 'admin']);
        $this->assertDatabaseHas('roles', ['code' => 'teacher']);
        $this->assertDatabaseHas('roles', ['code' => 'student']);
        $this->assertDatabaseHas('users', [
            'email' => 'admin2@demo.seongon.vn',
            'role' => 'admin',
        ]);
    }
}
