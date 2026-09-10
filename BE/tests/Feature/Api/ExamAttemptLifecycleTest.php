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
