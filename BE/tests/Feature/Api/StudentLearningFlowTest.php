<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StudentLearningFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_access_student_purchase_or_learning_endpoints(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $lesson = Lesson::factory()->create(['course_id' => $course->id]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/orders', ['course_id' => $course->id])->assertForbidden();
        $this->withToken($token)->getJson('/api/v1/my/courses')->assertForbidden();
        $this->withToken($token)->getJson("/api/v1/my/courses/{$course->id}/lessons")->assertForbidden();
        $this->withToken($token)->postJson("/api/v1/my/lessons/{$lesson->id}/complete")->assertForbidden();
    }

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
        $firstLesson = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 1]);
        $secondLesson = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 2]);
        $quiz = Exam::factory()->create(['course_id' => $course->id, 'pass_score' => 75]);
        $question = Question::factory()->create(['exam_id' => $quiz->id]);
        $correctOption = Answer::factory()->correct()->create(['question_id' => $question->id]);
        Answer::factory()->create(['question_id' => $question->id]);
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

    public function test_my_courses_includes_certificate_null_shape_without_per_row_certificate_queries(): void
    {
        $student = User::factory()->create();
        $certifiedCourse = Course::factory()->create();
        $certifiedEnrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $certifiedCourse->id,
        ]);
        Certificate::create([
            'enrollment_id' => $certifiedEnrollment->id,
            'certificate_code' => 'CERT-MY-COURSES-001',
            'issued_at' => now(),
        ]);
        $uncertifiedCourse = Course::factory()->create();
        $uncertifiedEnrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $uncertifiedCourse->id,
        ]);
        $token = $student->createToken('test')->plainTextToken;

        DB::flushQueryLog();
        DB::enableQueryLog();
        $response = $this->withToken($token)->getJson('/api/v1/my/courses')->assertOk();
        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $enrollments = collect($response->json('data'))->keyBy('id');
        $this->assertSame(
            'CERT-MY-COURSES-001',
            $enrollments->get($certifiedEnrollment->id)['certificate']['certificate_code'],
        );
        $this->assertNull($enrollments->get($uncertifiedEnrollment->id)['certificate']);
        $this->assertCount(1, array_filter(
            $queries,
            fn (array $query) => str_contains(strtolower($query['query']), 'certificates'),
        ));
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

    public function test_my_courses_paginates_enrollments_and_returns_global_percent_based_summary(): void
    {
        $student = User::factory()->create();
        $token = $student->createToken('test')->plainTextToken;

        $completedCourse = Course::factory()->create();
        $completedEnrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $completedCourse->id,
        ]);
        $completedLesson = Lesson::factory()->create(['course_id' => $completedCourse->id]);
        LearningProgress::create([
            'enrollment_id' => $completedEnrollment->id,
            'lesson_id' => $completedLesson->id,
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        for ($index = 1; $index <= 12; $index++) {
            $course = Course::factory()->create();
            $enrollment = Enrollment::factory()->create([
                'user_id' => $student->id,
                'course_id' => $course->id,
            ]);

            if ($index <= 3) {
                $lesson = Lesson::factory()->create(['course_id' => $course->id]);
                LearningProgress::create([
                    'enrollment_id' => $enrollment->id,
                    'lesson_id' => $lesson->id,
                    'is_completed' => true,
                    'completed_at' => now(),
                ]);
            }
        }

        $this->withToken($token)->getJson('/api/v1/my/courses')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 13)
            ->assertJsonCount(12, 'data')
            ->assertJsonPath('summary.total', 13)
            ->assertJsonPath('summary.completed', 4)
            ->assertJsonPath('summary.active', 9);

        $this->withToken($token)->getJson('/api/v1/my/courses?page=2')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('summary.total', 13)
            ->assertJsonPath('summary.completed', 4)
            ->assertJsonPath('summary.active', 9);

    }
}
