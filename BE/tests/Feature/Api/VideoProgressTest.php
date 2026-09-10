<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\User;
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
        $lesson = Lesson::factory()->create(['course_id' => $course->id]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => 300,
            'duration_seconds' => 600,
        ])->assertOk()
            ->assertJsonPath('lesson.resume_position_seconds', 300)
            ->assertJsonPath('lesson.furthest_position_seconds', 300)
            ->assertJsonPath('lesson.watched_percent', 50)
            ->assertJsonPath('course_progress.video_percent', 50);

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$lesson->id}/progress", [
            'position_seconds' => 120,
            'duration_seconds' => 600,
        ])->assertOk()
            ->assertJsonPath('lesson.resume_position_seconds', 120)
            ->assertJsonPath('lesson.furthest_position_seconds', 300)
            ->assertJsonPath('lesson.watched_percent', 50);

        $this->withToken($token)->getJson("/api/v1/my/courses/{$course->id}/lessons")
            ->assertOk()
            ->assertJsonPath('data.0.resume_position_seconds', 120)
            ->assertJsonPath('data.0.furthest_position_seconds', 300);
    }

    public function test_course_video_percent_uses_total_duration_and_completes_at_ninety_five_percent(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $first = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 1]);
        $second = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 2]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$first->id}/progress", [
            'position_seconds' => 570,
            'duration_seconds' => 600,
        ])->assertOk()
            ->assertJsonPath('lesson.is_completed', true)
            ->assertJsonPath('course_progress.completed', 1)
            ->assertJsonPath('course_progress.video_percent', 95)
            ->assertJsonPath('course_progress.can_take_exam', false);

        $this->withToken($token)->patchJson("/api/v1/my/lessons/{$second->id}/progress", [
            'position_seconds' => 300,
            'duration_seconds' => 600,
        ])->assertOk()
            ->assertJsonPath('course_progress.video_percent', 72);
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
}
