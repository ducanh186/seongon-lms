<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Category;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dashboard_returns_real_monthly_series_and_popular_course_ranking(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(2)->create();
        $popular = Course::factory()->create(['title' => 'Popular SEO']);
        $secondary = Course::factory()->create(['title' => 'Secondary Ads']);
        $first = Enrollment::factory()->create(['course_id' => $popular->id, 'enrolled_at' => now()->subMonth()]);
        Enrollment::factory()->create(['course_id' => $popular->id, 'enrolled_at' => now()]);
        Enrollment::factory()->create(['course_id' => $secondary->id, 'enrolled_at' => now()]);
        Certificate::query()->create([
            'enrollment_id' => $first->id,
            'certificate_code' => 'DASHBOARD-CERT-001',
            'issued_at' => now(),
        ]);
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/admin/dashboard/stats');

        $response->assertOk()
            ->assertJsonPath('students', 5)
            ->assertJsonPath('courses', 2)
            ->assertJsonPath('enrollments', 3)
            ->assertJsonPath('certificates', 1)
            ->assertJsonPath('completion_rate', 33.3)
            ->assertJsonPath('popular_courses.0.id', $popular->id)
            ->assertJsonPath('popular_courses.0.enrollments_count', 2)
            ->assertJsonCount(12, 'monthly_enrollments');

        $months = collect($response->json('monthly_enrollments'))->pluck('month')->all();
        $this->assertSame($months, collect($months)->sort()->values()->all());
    }

    public function test_admin_dashboard_has_zero_completion_rate_without_enrollments(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('completion_rate', 0)
            ->assertJsonPath('popular_courses', []);
    }

    public function test_admin_course_list_includes_lesson_question_and_enrollment_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        Lesson::factory()->count(2)->create(['course_id' => $course->id]);
        $quiz = Exam::factory()->create(['course_id' => $course->id]);
        Question::factory()->count(3)->create(['exam_id' => $quiz->id]);
        Enrollment::factory()->count(4)->create(['course_id' => $course->id]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/courses')
            ->assertOk()
            ->assertJsonPath('data.0.lessons_count', 2)
            ->assertJsonPath('data.0.questions_count', 3)
            ->assertJsonPath('data.0.enrollments_count', 4);
    }

    public function test_admin_user_list_includes_each_students_enrollment_count(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        $firstCourse = Course::factory()->create();
        $secondCourse = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $firstCourse->id]);
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $secondCourse->id]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonPath('data.0.enrollments_count', 2);
    }

    public function test_admin_course_detail_includes_editable_quiz_data_without_changing_public_course_data(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $quiz = Exam::factory()->create(['course_id' => $course->id]);
        $question = Question::factory()->create(['exam_id' => $quiz->id, 'content' => 'Cau hoi?']);
        Answer::factory()->correct()->create(['question_id' => $question->id, 'content' => 'Dung']);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/admin/courses/{$course->id}")
            ->assertOk()
            ->assertJsonPath('data.quiz.id', $quiz->id)
            ->assertJsonPath('data.quiz.questions.0.id', $question->id)
            ->assertJsonPath('data.quiz.questions.0.options.0.is_correct', true);

        $this->getJson("/api/v1/courses/{$course->slug}")
            ->assertOk()
            ->assertJsonMissingPath('data.quiz.questions.0.options.0.is_correct');
    }

    public function test_student_cannot_access_admin_routes(): void
    {
        $student = User::factory()->create();
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/dashboard/stats')->assertForbidden();
    }

    public function test_admin_can_manage_catalog_and_view_dashboard_statistics(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $categoryResponse = $this->withToken($token)->postJson('/api/v1/admin/categories', [
            'name' => 'Analytics',
            'description' => 'Khoa hoc phan tich du lieu',
        ]);
        $categoryResponse->assertCreated()->assertJsonPath('data.name', 'Analytics');
        $categoryId = $categoryResponse->json('data.id');

        $courseResponse = $this->withToken($token)->postJson('/api/v1/admin/courses', [
            'category_id' => $categoryId,
            'title' => 'Google Analytics Foundation',
            'description' => 'Mo ta khoa hoc',
            'thumbnail' => 'https://example.test/course.png',
            'price' => 299000,
            'instructor_name' => 'Instructor',
            'instructor_bio' => 'Bio',
            'level' => 'beginner',
            'status' => 'draft',
        ]);
        $courseResponse->assertCreated()->assertJsonPath('data.status', 'draft');
        $courseId = $courseResponse->json('data.id');

        $this->withToken($token)->patchJson("/api/v1/admin/courses/{$courseId}/publish", ['status' => 'published'])
            ->assertOk()->assertJsonPath('data.status', 'published');

        $lesson = $this->withToken($token)->postJson("/api/v1/admin/courses/{$courseId}/lessons", [
            'title' => 'Bai hoc 1',
            'video_url' => 'https://www.youtube.com/embed/example',
            'duration' => 600,
        ]);
        $lesson->assertCreated()->assertJsonPath('data.position', 1);

        $quiz = $this->withToken($token)->postJson("/api/v1/admin/courses/{$courseId}/quiz", [
            'title' => 'Kiem tra cuoi khoa',
            'pass_score' => 75,
            'max_attempts' => 3,
        ]);
        $quiz->assertOk()->assertJsonPath('course_id', $courseId);

        $this->withToken($token)->postJson('/api/v1/admin/quizzes/'.$quiz->json('id').'/questions', [
            'content' => 'Cau hoi mau?',
            'options' => [
                ['content' => 'Dung', 'is_correct' => true],
                ['content' => 'Sai', 'is_correct' => false],
            ],
        ])->assertCreated()->assertJsonCount(2, 'options');

        $this->withToken($token)->patchJson("/api/v1/admin/users/{$student->id}/status", ['status' => 'locked'])
            ->assertOk()->assertJsonPath('data.status', 'locked');

        $this->withToken($token)->getJson('/api/v1/admin/dashboard/stats')
            ->assertOk()->assertJsonPath('students', 1)->assertJsonPath('courses', 1);
    }

    public function test_admin_can_moderate_a_review(): void
    {
        $admin = User::factory()->admin()->create();
        $review = Review::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->patchJson("/api/v1/admin/reviews/{$review->id}/status", ['status' => 'hidden'])
            ->assertOk()->assertJsonPath('data.status', 'hidden');

        $this->withToken($token)->deleteJson("/api/v1/admin/reviews/{$review->id}")
            ->assertNoContent();
        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }

    public function test_admin_can_update_reorder_and_delete_course_content(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $first = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 1]);
        $second = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 2]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->patchJson("/api/v1/admin/courses/{$course->id}/lessons/reorder", [
            'order' => [$second->id, $first->id],
        ])->assertOk()->assertJsonPath('data.0.id', $second->id);

        $this->assertDatabaseHas('lessons', ['id' => $second->id, 'sort_order' => 1]);
    }

    public function test_admin_can_update_and_delete_category_course_lesson_and_question(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();
        $course = Course::factory()->create(['category_id' => $category->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id]);
        $quiz = Exam::factory()->create(['course_id' => $course->id]);
        $question = Question::factory()->create(['exam_id' => $quiz->id]);
        Answer::factory()->correct()->create(['question_id' => $question->id]);
        Answer::factory()->create(['question_id' => $question->id]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->putJson("/api/v1/admin/categories/{$category->id}", [
            'name' => 'Updated category',
            'description' => 'Updated description',
        ])->assertOk()->assertJsonPath('data.name', 'Updated category');

        $this->withToken($token)->putJson("/api/v1/admin/courses/{$course->id}", [
            'category_id' => $category->id,
            'title' => 'Updated course',
            'description' => 'Updated description',
            'thumbnail' => null,
            'price' => 100000,
            'instructor_name' => 'Instructor',
            'instructor_bio' => 'Bio',
            'level' => 'beginner',
            'status' => 'draft',
        ])->assertOk()->assertJsonPath('data.title', 'Updated course');

        $this->withToken($token)->putJson("/api/v1/admin/lessons/{$lesson->id}", [
            'title' => 'Updated lesson',
            'video_url' => 'https://example.test/embed',
            'description' => 'Lesson description',
            'duration' => 120,
            'position' => 1,
        ])->assertOk()->assertJsonPath('data.title', 'Updated lesson');

        $this->withToken($token)->putJson("/api/v1/admin/questions/{$question->id}", [
            'content' => 'Updated question',
            'options' => [
                ['content' => 'Correct', 'is_correct' => true],
                ['content' => 'Incorrect', 'is_correct' => false],
            ],
        ])->assertOk()->assertJsonPath('content', 'Updated question')->assertJsonCount(2, 'options');

        $this->withToken($token)->deleteJson("/api/v1/admin/questions/{$question->id}")->assertNoContent();
        $this->withToken($token)->deleteJson("/api/v1/admin/lessons/{$lesson->id}")->assertNoContent();
        $this->withToken($token)->deleteJson("/api/v1/admin/courses/{$course->id}")->assertNoContent();
        $this->withToken($token)->deleteJson("/api/v1/admin/categories/{$category->id}")->assertNoContent();
    }

    public function test_student_is_forbidden_from_admin_course_detail(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/admin/courses/{$course->id}")->assertForbidden();
    }
}
