<?php

use App\Models\Enrollment;
use App\Models\LearningProgress;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('blocks learning when the enrollment has expired', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(3);
    Enrollment::factory()->expired()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);

    $this->getJson("/api/v1/my/courses/{$course->id}/lessons")->assertStatus(403);
});

it('tracks lesson completion progress', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(4);
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);

    $lesson = $course->lessons->first();
    $enrollment = Enrollment::query()->where('user_id', $user->id)->where('course_id', $course->id)->firstOrFail();
    LearningProgress::query()->create([
        'enrollment_id' => $enrollment->id,
        'lesson_id' => $lesson->id,
        'video_duration_seconds' => $lesson->duration,
        'watched_seconds' => (int) ceil($lesson->duration * 0.95),
        'watched_segments' => [['start' => 0, 'end' => (int) ceil($lesson->duration * 0.95)]],
    ]);

    $this->postJson("/api/v1/my/lessons/{$lesson->id}/complete")
        ->assertOk()
        ->assertJsonPath('completed', 1)
        ->assertJsonPath('total', 4)
        ->assertJsonPath('percent', 25);
});

it('blocks the final exam until progress reaches 100%', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(2);
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);

    // Hoàn thành 1 trong 2 bài học.
    $enrollment = Enrollment::query()->where('user_id', $user->id)->where('course_id', $course->id)->firstOrFail();
    $lesson = $course->lessons->first();
    LearningProgress::query()->create([
        'enrollment_id' => $enrollment->id,
        'lesson_id' => $lesson->id,
        'video_duration_seconds' => $lesson->duration,
        'watched_seconds' => (int) ceil($lesson->duration * 0.95),
        'watched_segments' => [['start' => 0, 'end' => (int) ceil($lesson->duration * 0.95)]],
    ]);
    $this->postJson("/api/v1/my/lessons/{$course->lessons->first()->id}/complete");

    $this->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", [
        'answers' => quizAnswers($course, true),
    ])->assertStatus(403);
});
