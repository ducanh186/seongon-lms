<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlaybackSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_read_and_update_the_global_anti_cheat_setting(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/admin/playback-settings')
            ->assertOk()
            ->assertJsonPath('data.anti_cheat_enabled', true);

        $this->withToken($token)
            ->putJson('/api/v1/admin/playback-settings', ['anti_cheat_enabled' => false])
            ->assertOk()
            ->assertJsonPath('data.anti_cheat_enabled', false);
    }

    public function test_non_admin_cannot_change_the_playback_setting(): void
    {
        $student = User::factory()->create();
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/playback-settings')->assertForbidden();
        $this->withToken($token)
            ->putJson('/api/v1/admin/playback-settings', ['anti_cheat_enabled' => false])
            ->assertForbidden();
    }

    public function test_disabled_anti_cheat_credits_a_seek_but_keeps_database_duration_authoritative(): void
    {
        $admin = User::factory()->admin()->create();
        $adminToken = $admin->createToken('test')->plainTextToken;
        $this->withToken($adminToken)
            ->putJson('/api/v1/admin/playback-settings', ['anti_cheat_enabled' => false])
            ->assertOk();

        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id, 'duration' => 100]);
        $this->actingAs($student, 'sanctum')
            ->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
                'position_seconds' => 100,
                'duration_seconds' => 999,
            ])
            ->assertOk()
            ->assertJsonPath('lesson.video_duration_seconds', 100)
            ->assertJsonPath('lesson.watched_seconds', 100)
            ->assertJsonPath('lesson.is_completed', true);
    }
}
