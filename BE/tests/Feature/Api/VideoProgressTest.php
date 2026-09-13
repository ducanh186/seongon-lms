<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VideoProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_playback_resumes_from_latest_position_without_regressing_watched_progress(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id, 'duration' => 600]);
        $token = $student->createToken('test')->plainTextToken;
        Carbon::setTestNow('2026-09-12 10:00:00');

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => 0,
            'duration_seconds' => 600,
        ])->assertOk()
            ->assertJsonPath('lesson.watched_percent', 0)
            ->assertJsonPath('course_progress.video_percent', 0);

        foreach (range(1, 30) as $position) {
            Carbon::setTestNow(Carbon::now()->addSeconds(10));
            $response = $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
                'position_seconds' => $position * 10,
                'duration_seconds' => 600,
            ])->assertOk();
        }
        $response->assertJsonPath('lesson.resume_position_seconds', 300)
            ->assertJsonPath('lesson.furthest_position_seconds', 300)
            ->assertJsonPath('lesson.watched_percent', 50);

        Carbon::setTestNow('2026-09-12 10:00:42');
        $this->withToken($token)->getJson("/api/v1/my/courses/{$course->id}/lessons")
            ->assertOk()
            ->assertJsonPath('data.0.resume_position_seconds', 300)
            ->assertJsonPath('data.0.furthest_position_seconds', 300)
            ->assertJsonPath('data.0.watched_percent', 50);
    }

    public function test_lesson_completes_only_when_the_video_is_watched_to_the_end(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $first = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 1, 'duration' => 600]);
        $second = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 2, 'duration' => 600]);
        $token = $student->createToken('test')->plainTextToken;

        Carbon::setTestNow('2026-09-12 10:00:00');
        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$first->id}/progress", [
            'position_seconds' => 0,
            'duration_seconds' => 600,
        ])->assertOk();

        // A 95 % jump is not playback and must not complete the lesson.
        Carbon::setTestNow('2026-09-12 10:00:10');
        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$first->id}/progress", [
            'position_seconds' => 570,
            'duration_seconds' => 600,
        ])->assertOk()
            ->assertJsonPath('lesson.is_completed', false)
            ->assertJsonPath('course_progress.completed', 0)
            ->assertJsonPath('course_progress.video_percent', 0);

        // Sequential heartbeats credit actual playback and unlock at 95 %.
        Carbon::setTestNow(Carbon::now()->addSeconds(10));
        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$first->id}/progress", [
            'position_seconds' => 0,
            'duration_seconds' => 600,
        ])->assertOk();
        foreach (range(1, 57) as $position) {
            Carbon::setTestNow(Carbon::now()->addSeconds(10));
            $response = $this->withToken($token)->patchJson("/api/v1/my/lessons/{$first->id}/progress", [
                'position_seconds' => $position * 10,
                'duration_seconds' => 600,
            ])->assertOk();
        }
        $response->assertJsonPath('lesson.is_completed', true)
            ->assertJsonPath('course_progress.completed', 1)
            ->assertJsonPath('course_progress.video_percent', 95);

        Carbon::setTestNow(Carbon::now()->addSeconds(10));
        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$second->id}/progress", [
            'position_seconds' => 0,
            'duration_seconds' => 600,
        ])->assertOk();
        foreach (range(1, 30) as $position) {
            Carbon::setTestNow(Carbon::now()->addSeconds(10));
            $response = $this->withToken($token)->patchJson("/api/v1/my/lessons/{$second->id}/progress", [
                'position_seconds' => $position * 10,
                'duration_seconds' => 600,
            ])->assertOk();
        }
        $response->assertJsonPath('course_progress.video_percent', 72);
    }

    public function test_playback_endpoint_requires_an_active_enrollment_and_valid_non_negative_values(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $lesson = Lesson::factory()->create(['course_id' => $course->id]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => 10,
            'duration_seconds' => 100,
        ])->assertNotFound();

        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => -1,
            'duration_seconds' => 0,
        ])->assertUnprocessable();
    }

    public function test_seeking_to_the_end_does_not_credit_unwatched_time_or_complete_the_lesson(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id, 'duration' => 600]);
        $token = $student->createToken('test')->plainTextToken;
        Carbon::setTestNow('2026-09-12 10:00:00');

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => 0,
            'duration_seconds' => 600,
        ])->assertOk();

        Carbon::setTestNow('2026-09-12 10:00:10');
        $response = $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => 600,
            'duration_seconds' => 600,
        ])->assertOk();

        $response->assertJsonPath('lesson.is_completed', false)
            ->assertJsonPath('course_progress.completed', 0);
        $this->assertDatabaseHas('lesson_progress', [
            'lesson_id' => $lesson->id,
            'watched_seconds' => 0,
        ]);
    }

    public function test_sequential_heartbeats_credit_real_playback_until_the_lesson_is_complete(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id, 'duration' => 100]);
        $token = $student->createToken('test')->plainTextToken;
        Carbon::setTestNow('2026-09-12 10:00:00');

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => 0,
            'duration_seconds' => 999,
        ])->assertOk();

        foreach (range(1, 10) as $position) {
            Carbon::setTestNow(Carbon::now()->addSeconds(10));
            $response = $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
                'position_seconds' => $position * 10,
                'duration_seconds' => 999,
            ])->assertOk();
        }

        $response->assertJsonPath('lesson.is_completed', true)
            ->assertJsonPath('course_progress.completed', 1);
        $this->assertDatabaseHas('lesson_progress', [
            'lesson_id' => $lesson->id,
            'watched_seconds' => 100,
            'video_duration_seconds' => 100,
        ]);
    }

    public function test_playback_uses_the_database_duration_when_client_duration_differs(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id, 'duration' => 600]);
        $token = $student->createToken('test')->plainTextToken;
        Carbon::setTestNow('2026-09-12 10:00:00');

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => 0,
            'duration_seconds' => 170,
        ])->assertOk()
            ->assertJsonPath('lesson.video_duration_seconds', 600);

        foreach (range(1, 60) as $position) {
            Carbon::setTestNow(Carbon::now()->addSeconds(10));
            $response = $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
                'position_seconds' => $position * 10,
                'duration_seconds' => 170,
            ])->assertOk();
        }

        $response->assertJsonPath('lesson.is_completed', true)
            ->assertJsonPath('lesson.video_duration_seconds', 600);
    }

    public function test_legacy_complete_endpoint_cannot_bypass_video_watch_requirement(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id, 'duration' => 100]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson("/api/v1/my/lessons/{$lesson->id}/complete")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Hãy xem đủ thời lượng video trước khi hoàn thành bài học.');

        $this->assertDatabaseMissing('lesson_progress', [
            'lesson_id' => $lesson->id,
            'is_completed' => true,
        ]);
    }
}
