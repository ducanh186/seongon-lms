<?php

use App\Models\Enrollment;
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
    $this->postJson("/api/v1/my/lessons/{$course->lessons->first()->id}/complete");

    $this->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", [
        'answers' => quizAnswers($course, true),
    ])->assertStatus(403);
});
