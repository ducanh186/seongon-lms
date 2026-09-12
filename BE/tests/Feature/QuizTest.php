<?php

use App\Models\Certificate;
use App\Models\Enrollment;
use App\Models\LearningProgress;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function completeAll($test, $course): void
{
    $enrollment = Enrollment::query()
        ->where('user_id', auth()->id())
        ->where('course_id', $course->id)
        ->firstOrFail();

    foreach ($course->lessons as $lesson) {
        $duration = (int) ($lesson->duration ?? 0);
        $watched = (int) ceil($duration * 0.95);
        LearningProgress::query()->updateOrCreate(
            ['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id],
            [
                'is_completed' => true,
                'completed_at' => now(),
                'video_duration_seconds' => $duration,
                'watched_seconds' => $watched,
                'watched_segments' => [['start' => 0, 'end' => $watched]],
            ],
        );
    }
}

it('grades a passing attempt and issues a certificate', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(2);
    $enrollment = Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);
    completeAll($this, $course);

    $this->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", [
        'answers' => quizAnswers($course, true),
    ])
        ->assertOk()
        ->assertJsonPath('passed', true)
        ->assertJsonPath('score', 100);

    expect(Certificate::where('enrollment_id', $enrollment->id)->exists())->toBeTrue();
});

it('fails an attempt below the pass score and issues no certificate', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(1);
    $enrollment = Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);
    completeAll($this, $course);

    $this->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", [
        'answers' => quizAnswers($course, false),
    ])
        ->assertOk()
        ->assertJsonPath('passed', false)
        ->assertJsonPath('score', 0);

    expect(Certificate::where('enrollment_id', $enrollment->id)->exists())->toBeFalse();
});

it('enforces the maximum number of attempts', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(1); // max_attempts = 2
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);
    completeAll($this, $course);

    $payload = ['answers' => quizAnswers($course, false)];

    $this->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", $payload)->assertOk();
    $this->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", $payload)->assertOk();
    $this->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", $payload)->assertStatus(422);
});
