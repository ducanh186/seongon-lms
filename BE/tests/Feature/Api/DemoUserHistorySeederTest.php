<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\DemoUserHistorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoUserHistorySeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_history_is_chronological_idempotent_and_matches_current_status(): void
    {
        $active = User::factory()->create(['email' => 'student001@demo.seongon.vn', 'status' => 'active', 'created_at' => now()->subDay()]);
        $locked = User::factory()->create(['email' => 'student002@demo.seongon.vn', 'status' => 'locked', 'created_at' => now()->subDay()]);
        $real = User::factory()->create(['email' => 'real@example.test']);
        $this->seed(DemoUserHistorySeeder::class);
        $this->seed(DemoUserHistorySeeder::class);

        foreach ([$active, $locked] as $student) {
            $records = $student->statusRecords()->oldest('created_at')->get();
            $this->assertCount(4, $records);
            $this->assertSame($student->status, $records->last()->new_status);
            foreach ($records as $index => $record) {
                $this->assertNotSame($record->old_status, $record->new_status);
                $this->assertNotEmpty($record->reason);
                $this->assertTrue($record->created_at->lessThanOrEqualTo(now()));
                if ($index > 0) {
                    $this->assertSame($records[$index - 1]->new_status, $record->old_status);
                    $this->assertTrue($record->created_at->greaterThan($records[$index - 1]->created_at));
                }
            }
        }
        $this->assertSame(0, $real->statusRecords()->count());
    }

    public function test_existing_history_is_never_overwritten_or_extended(): void
    {
        $student = User::factory()->create(['email' => 'student001@demo.seongon.vn', 'status' => 'locked']);
        $student->statusRecords()->create(['old_status' => 'active', 'new_status' => 'locked', 'reason' => 'Existing moderation decision']);
        $this->seed(DemoUserHistorySeeder::class);
        $this->assertSame(1, $student->statusRecords()->count());
        $this->assertSame('locked', $student->fresh()->status);
    }

    public function test_fresh_demo_history_never_predates_the_account(): void
    {
        $this->freezeTime();
        $student = User::factory()->create(['email' => 'student001@demo.seongon.vn']);
        $this->seed(DemoUserHistorySeeder::class);
        $records = $student->statusRecords()->oldest('created_at')->oldest('id')->get();
        $this->assertCount(4, $records);
        foreach ($records as $record) {
            $this->assertTrue($record->created_at->greaterThanOrEqualTo($student->created_at));
            $this->assertTrue($record->created_at->lessThanOrEqualTo(now()));
        }
    }
}
