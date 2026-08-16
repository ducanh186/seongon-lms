<?php

use App\Models\Attempt;
use App\Models\Enrollment;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/**
 * P0 step D3 — attempts.answers replaces the quiz_attempt_answers table.
 *
 * Two things must hold at once: the column stores the approved ERD shape, and the
 * HTTP payload keeps the legacy field names the frontend reads. Renaming those
 * fields is a breaking change reserved for P3.
 */
function submitExam($test, $course, bool $correct)
{
    foreach ($course->lessons as $lesson) {
        $test->postJson("/api/v1/my/lessons/{$lesson->id}/complete");
    }

    return $test->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", [
        'answers' => quizAnswers($course, $correct),
    ]);
}

it('stores selected answers in the approved JSON shape', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(1);
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);

    submitExam($this, $course, true)->assertOk();

    $attempt = Attempt::query()->firstOrFail();

    expect($attempt->answers)->toHaveCount(4)
        ->and(array_keys($attempt->answers[0]))->toEqualCanonicalizing(
            ['question_id', 'selected_answer_id', 'is_correct']
        )
        ->and($attempt->correct_count)->toBe(4)
        ->and($attempt->wrong_count)->toBe(0)
        ->and($attempt->attempt_number)->toBe(1);
});

it('counts wrong answers separately', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(1);
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);

    submitExam($this, $course, false)->assertOk();

    $attempt = Attempt::query()->firstOrFail();

    expect($attempt->correct_count)->toBe(0)->and($attempt->wrong_count)->toBe(4);
});

it('keeps the legacy attempt field names in the API payload', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(1);
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);

    $response = submitExam($this, $course, true)->assertOk();

    $attempt = $response->json('attempt');

    expect($attempt)->toHaveKeys(['id', 'quiz_id', 'score', 'passed', 'attempt_no', 'submitted_at', 'answers'])
        ->and(array_keys($attempt['answers'][0]))->toEqualCanonicalizing(
            ['question_id', 'selected_option_id', 'is_correct']
        );
});

it('lets a student reopen a past attempt and see per-question results', function () {
    $user = User::factory()->create();
    $course = makeCourseWithContent(1);
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);

    submitExam($this, $course, false)->assertOk();
    $attemptId = Attempt::query()->value('id');

    $this->getJson("/api/v1/my/quiz-attempts/{$attemptId}")
        ->assertOk()
        ->assertJsonCount(4, 'data.answers')
        ->assertJsonPath('data.answers.0.is_correct', false)
        ->assertJsonPath('data.attempt_no', 1);
});

it('keeps the options key on the admin question endpoints', function () {
    $admin = User::factory()->admin()->create();
    $course = makeCourseWithContent(1);
    Sanctum::actingAs($admin);

    $this->postJson("/api/v1/admin/courses/{$course->id}/quiz", [
        'title' => 'Đề thi cuối khóa',
        'pass_score' => 70,
        'max_attempts' => 3,
    ])->assertOk()->assertJsonStructure(['questions' => [['id', 'content', 'options']]]);
});
