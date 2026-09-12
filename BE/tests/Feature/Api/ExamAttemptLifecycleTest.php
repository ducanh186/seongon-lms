<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamAttemptLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_start_resumes_one_active_attempt_and_restores_saved_answers(): void
    {
        Carbon::setTestNow('2026-09-10 08:00:00');
        [$student, $course, $exam, $question, $answer] = $this->learningFixture();
        $token = $student->createToken('test')->plainTextToken;

        $started = $this->withToken($token)->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts/start")
            ->assertOk()
            ->assertJsonPath('attempt.status', 'in_progress')
            ->assertJsonPath('attempt.attempt_no', 1)
            ->assertJsonPath('attempt.answers', []);
        $attemptId = $started->json('attempt.id');

        $this->withToken($token)->patchJson("/api/v1/my/quiz-attempts/{$attemptId}/answers", [
            'answers' => [['question_id' => $question->id, 'option_id' => $answer->id]],
        ])->assertOk()
            ->assertJsonPath('attempt.answers.0.selected_option_id', $answer->id)
            ->assertJsonMissingPath('attempt.answers.0.is_correct');

        $this->withToken($token)->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts/start")
            ->assertOk()
            ->assertJsonPath('attempt.id', $attemptId)
            ->assertJsonPath('attempt.answers.0.selected_option_id', $answer->id);

        $this->assertDatabaseCount('attempts', 1);
        $this->assertSame($exam->id, Attempt::firstOrFail()->exam_id);
    }

    public function test_server_deadline_auto_finalizes_saved_answers_and_rejects_late_changes(): void
    {
        Carbon::setTestNow('2026-09-10 08:00:00');
        [$student, $course, , $question, $answer] = $this->learningFixture(durationMinutes: 1);
        $token = $student->createToken('test')->plainTextToken;
        $attemptId = $this->withToken($token)
            ->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts/start")
            ->json('attempt.id');

        $this->withToken($token)->patchJson("/api/v1/my/quiz-attempts/{$attemptId}/answers", [
            'answers' => [['question_id' => $question->id, 'option_id' => $answer->id]],
        ])->assertOk();

        Carbon::setTestNow('2026-09-10 08:01:01');
        $this->withToken($token)->patchJson("/api/v1/my/quiz-attempts/{$attemptId}/answers", [
            'answers' => [],
        ])->assertStatus(409);

        $attempt = Attempt::findOrFail($attemptId);
        $this->assertSame('expired', $attempt->status);
        $this->assertSame(100, $attempt->score);
        $this->assertTrue($attempt->passed);
        $this->assertNotNull($attempt->finished_at);
    }

    public function test_expiry_command_finalizes_dormant_attempts(): void
    {
        Carbon::setTestNow('2026-09-10 08:00:00');
        [$student, $course] = $this->learningFixture(durationMinutes: 1);
        $token = $student->createToken('test')->plainTextToken;
        $attemptId = $this->withToken($token)
            ->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts/start")
            ->json('attempt.id');

        Carbon::setTestNow('2026-09-10 08:02:00');
        $this->artisan('attempts:finalize-expired')->assertSuccessful();

        $this->assertSame('expired', Attempt::findOrFail($attemptId)->status);
    }

    public function test_quiz_overview_lists_owned_attempts_and_remaining_count(): void
    {
        Carbon::setTestNow('2026-09-11 08:00:00');
        [$student, $course, $exam, $question] = $this->learningFixture();
        $exam->update([
            'max_attempts' => 2,
            'closes_at' => now()->addDay(),
        ]);
        $attempt = Attempt::query()->create([
            'enrollment_id' => Enrollment::query()->where('user_id', $student->id)->value('id'),
            'exam_id' => $exam->id,
            'score' => 0,
            'passed' => false,
            'attempt_number' => 1,
            'status' => 'submitted',
            'started_at' => now()->subMinutes(10),
            'expires_at' => now()->addMinutes(20),
            'finished_at' => now(),
            'submitted_at' => now(),
            'correct_count' => 0,
            'wrong_count' => 1,
            'answers' => [[
                'question_id' => $question->id,
                'selected_answer_id' => null,
                'is_correct' => false,
            ]],
        ]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/my/courses/{$course->id}/quiz")
            ->assertOk()
            ->assertJsonPath('data.attempts_remaining', 1)
            ->assertJsonPath('data.best_score', 0)
            ->assertJsonPath('data.ended', false)
            ->assertJsonPath('data.attempts.0.id', $attempt->id)
            ->assertJsonPath('data.attempts.0.attempt_no', 1)
            ->assertJsonPath('data.attempts.0.wrong_count', 1);
    }

    public function test_closed_exam_rejects_a_new_attempt(): void
    {
        Carbon::setTestNow('2026-09-11 08:00:00');
        [$student, $course, $exam] = $this->learningFixture();
        $exam->update(['closes_at' => now()->subMinute()]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts/start")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Bài kiểm tra đã kết thúc.');
    }

    public function test_quiz_overview_is_ended_after_its_close_time(): void
    {
        Carbon::setTestNow('2026-09-11 08:00:00');
        [$student, $course, $exam] = $this->learningFixture();
        $exam->update(['closes_at' => now()->subMinute()]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/my/courses/{$course->id}/quiz")
            ->assertOk()
            ->assertJsonPath('data.ended', true);
    }

    public function test_quiz_overview_is_ended_after_all_attempts_are_used(): void
    {
        [$student, $course, $exam] = $this->learningFixture();
        $exam->update([
            'max_attempts' => 2,
            'closes_at' => now()->addDay(),
        ]);
        $enrollment = Enrollment::query()->where('user_id', $student->id)->firstOrFail();
        foreach ([1, 2] as $attemptNumber) {
            Attempt::query()->create([
                'enrollment_id' => $enrollment->id,
                'exam_id' => $exam->id,
                'score' => 50,
                'passed' => false,
                'attempt_number' => $attemptNumber,
                'status' => 'submitted',
                'started_at' => now()->subMinutes(5),
                'expires_at' => now()->addMinutes(25),
                'finished_at' => now(),
                'submitted_at' => now(),
                'correct_count' => 1,
                'wrong_count' => 1,
                'answers' => [],
            ]);
        }
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/my/courses/{$course->id}/quiz")
            ->assertOk()
            ->assertJsonPath('data.attempts_remaining', 0)
            ->assertJsonPath('data.ended', true);
    }

    public function test_quiz_overview_keeps_the_second_active_attempt_resumable(): void
    {
        Carbon::setTestNow('2026-09-11 08:00:00');
        [$student, $course, $exam] = $this->learningFixture();
        $exam->update(['max_attempts' => 2, 'closes_at' => now()->addDay()]);
        $enrollment = Enrollment::query()->where('user_id', $student->id)->firstOrFail();

        foreach (['submitted', 'in_progress'] as $index => $status) {
            Attempt::query()->create([
                'enrollment_id' => $enrollment->id,
                'exam_id' => $exam->id,
                'attempt_number' => $index + 1,
                'status' => $status,
                'started_at' => now(),
                'expires_at' => now()->addMinutes(30),
                'submitted_at' => $status === 'submitted' ? now() : null,
                'score' => $status === 'submitted' ? 50 : null,
                'answers' => [],
            ]);
        }

        $token = $student->createToken('test')->plainTextToken;
        $this->withToken($token)->getJson("/api/v1/my/courses/{$course->id}/quiz")
            ->assertOk()
            ->assertJsonPath('data.attempts_remaining', 1)
            ->assertJsonPath('data.ended', false);

        $this->withToken($token)->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts/start")
            ->assertOk()
            ->assertJsonPath('attempt.attempt_no', 2);
    }

    public function test_attempt_deadline_does_not_extend_past_the_exam_close_time(): void
    {
        Carbon::setTestNow('2026-09-11 08:00:00');
        [$student, $course, $exam] = $this->learningFixture(durationMinutes: 30);
        $exam->update(['closes_at' => now()->addMinutes(10)]);
        $token = $student->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts/start")
            ->assertOk();

        $this->assertSame(
            '2026-09-11 08:10:00',
            Carbon::parse($response->json('attempt.expires_at'))->format('Y-m-d H:i:s'),
        );
    }

    public function test_submitted_attempt_review_includes_the_correct_answer(): void
    {
        [$student, , $exam, $question, $correctAnswer] = $this->learningFixture();
        $wrongAnswer = Answer::query()
            ->where('question_id', $question->id)
            ->where('is_correct', false)
            ->firstOrFail();
        $enrollment = Enrollment::query()->where('user_id', $student->id)->firstOrFail();
        $attempt = Attempt::query()->create([
            'enrollment_id' => $enrollment->id,
            'exam_id' => $exam->id,
            'score' => 0,
            'passed' => false,
            'attempt_number' => 1,
            'status' => 'submitted',
            'started_at' => now()->subMinutes(5),
            'expires_at' => now()->addMinutes(25),
            'finished_at' => now(),
            'submitted_at' => now(),
            'correct_count' => 0,
            'wrong_count' => 1,
            'answers' => [[
                'question_id' => $question->id,
                'selected_answer_id' => $wrongAnswer->id,
                'is_correct' => false,
            ]],
        ]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/my/quiz-attempts/{$attempt->id}")
            ->assertOk()
            ->assertJsonPath('data.answers.0.selected_option_id', $wrongAnswer->id)
            ->assertJsonPath('data.answers.0.correct_answer_id', $correctAnswer->id);
    }

    public function test_finalize_response_includes_the_correct_answer_for_immediate_review(): void
    {
        [$student, , $exam, $question, $correctAnswer] = $this->learningFixture();
        $wrongAnswer = Answer::query()
            ->where('question_id', $question->id)
            ->where('is_correct', false)
            ->firstOrFail();
        $enrollment = Enrollment::query()->where('user_id', $student->id)->firstOrFail();
        $attempt = Attempt::query()->create([
            'enrollment_id' => $enrollment->id,
            'exam_id' => $exam->id,
            'attempt_number' => 1,
            'status' => 'in_progress',
            'started_at' => now()->subMinute(),
            'expires_at' => now()->addMinutes(29),
            'answers' => [[
                'question_id' => $question->id,
                'selected_answer_id' => $wrongAnswer->id,
            ]],
        ]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson("/api/v1/my/quiz-attempts/{$attempt->id}/submit")
            ->assertOk()
            ->assertJsonPath('attempt.answers.0.selected_option_id', $wrongAnswer->id)
            ->assertJsonPath('attempt.answers.0.correct_answer_id', $correctAnswer->id);
    }

    /** @return array{User, Course, Exam, Question, Answer} */
    private function learningFixture(int $durationMinutes = 30): array
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $enrollment = Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id]);
        $enrollment->learningProgress()->create([
            'lesson_id' => $lesson->id,
            'is_completed' => true,
            'completed_at' => now(),
        ]);
        $exam = Exam::factory()->create([
            'course_id' => $course->id,
            'pass_score' => 75,
            'max_attempts' => 3,
            'duration_minutes' => $durationMinutes,
        ]);
        $question = Question::factory()->create(['exam_id' => $exam->id]);
        $answer = Answer::factory()->correct()->create(['question_id' => $question->id]);
        Answer::factory()->create(['question_id' => $question->id]);

        return [$student, $course, $exam, $question, $answer];
    }
}
