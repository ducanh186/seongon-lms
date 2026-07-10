<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentLearningFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_retry_payment_and_successfully_receives_a_one_year_enrollment(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['price' => 499000]);
        $token = $student->createToken('test')->plainTextToken;

        $orderResponse = $this->withToken($token)->postJson('/api/v1/orders', ['course_id' => $course->id]);
        $orderResponse->assertCreated()->assertJsonPath('data.status', 'pending');
        $orderId = $orderResponse->json('data.id');

        $this->withToken($token)->postJson("/api/v1/orders/{$orderId}/pay", [
            'payment_method' => 'qr',
            'outcome' => 'failure',
        ])->assertUnprocessable()->assertJsonPath('order.status', 'failed');

        $this->withToken($token)->postJson("/api/v1/orders/{$orderId}/pay", [
            'payment_method' => 'qr',
            'outcome' => 'success',
        ])->assertOk()
            ->assertJsonPath('order.status', 'paid')
            ->assertJsonPath('enrollment.status', 'active');

        $enrollment = Enrollment::firstOrFail();
        $this->assertTrue($enrollment->expires_at->between(now()->addYear()->subMinute(), now()->addYear()->addMinute()));

        $this->withToken($token)->postJson('/api/v1/orders', ['course_id' => $course->id])
            ->assertUnprocessable();
    }

    public function test_student_progress_is_idempotent_and_unlocks_quiz_at_one_hundred_percent(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $enrollment = Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $firstLesson = Lesson::factory()->create(['course_id' => $course->id, 'position' => 1]);
        $secondLesson = Lesson::factory()->create(['course_id' => $course->id, 'position' => 2]);
        $quiz = Quiz::factory()->create(['course_id' => $course->id, 'pass_score' => 75]);
        $question = Question::factory()->create(['quiz_id' => $quiz->id]);
        $correctOption = QuestionOption::factory()->correct()->create(['question_id' => $question->id]);
        QuestionOption::factory()->create(['question_id' => $question->id]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", [
            'answers' => [['question_id' => $question->id, 'option_id' => $correctOption->id]],
        ])->assertForbidden();

        $this->withToken($token)->postJson("/api/v1/my/lessons/{$firstLesson->id}/complete")
            ->assertOk()->assertJsonPath('percent', 50);
        $this->withToken($token)->postJson("/api/v1/my/lessons/{$firstLesson->id}/complete")
            ->assertOk()->assertJsonPath('completed', 1);
        $this->withToken($token)->postJson("/api/v1/my/lessons/{$secondLesson->id}/complete")
            ->assertOk()->assertJsonPath('can_take_exam', true);

        $submission = $this->withToken($token)->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts", [
            'answers' => [['question_id' => $question->id, 'option_id' => $correctOption->id]],
        ]);

        $submission->assertOk()
            ->assertJsonPath('passed', true)
            ->assertJsonPath('score', 100)
            ->assertJsonStructure(['certificate' => ['certificate_code']]);
        $this->assertDatabaseHas('certificates', ['enrollment_id' => $enrollment->id]);
    }

    public function test_enrolled_student_can_upsert_a_single_review_and_expired_access_is_denied(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson("/api/v1/my/courses/{$course->id}/reviews", [
            'rating' => 4,
            'comment' => 'Noi dung ro rang',
        ])->assertCreated()->assertJsonPath('data.rating', 4);

        $this->withToken($token)->postJson("/api/v1/my/courses/{$course->id}/reviews", [
            'rating' => 5,
            'comment' => 'Cap nhat nhan xet',
        ])->assertCreated()->assertJsonPath('data.rating', 5);
        $this->assertDatabaseCount('reviews', 1);

        $expiredCourse = Course::factory()->create();
        $expired = Enrollment::factory()->expired()->create([
            'user_id' => $student->id,
            'course_id' => $expiredCourse->id,
        ]);

        $this->withToken($token)->getJson("/api/v1/my/courses/{$expiredCourse->id}/lessons")
            ->assertForbidden();
        $this->assertDatabaseHas('enrollments', ['id' => $expired->id, 'status' => 'expired']);
    }
}
