<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Category;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UcSpecAlignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_unlock_needs_only_confirmation_and_history_records_the_acting_admin(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Quản trị A']);
        $student = User::factory()->locked()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->patchJson("/api/v1/admin/users/{$student->id}/status", ['status' => 'active'])
            ->assertOk()->assertJsonPath('data.status', 'active');

        $this->withToken($token)->getJson("/api/v1/admin/users/{$student->id}/records")->assertOk()
            ->assertJsonPath('data.0.new_status', 'active')
            ->assertJsonPath('data.0.reason', 'Mở khóa tài khoản')
            ->assertJsonPath('data.0.changed_by.id', $admin->id)
            ->assertJsonPath('data.0.changed_by.name', 'Quản trị A');

        // Locking still demands a reason.
        $this->withToken($token)->patchJson("/api/v1/admin/users/{$student->id}/status", ['status' => 'locked'])
            ->assertUnprocessable()->assertJsonValidationErrors('reason');
    }

    public function test_admin_can_hide_a_published_course_and_hidden_courses_leave_the_public_catalog(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $course = Course::factory()->create(['status' => 'published']);

        $this->withToken($token)->patchJson("/api/v1/admin/courses/{$course->id}/publish", ['status' => 'hidden'])
            ->assertOk()->assertJsonPath('data.status', 'hidden');

        $this->getJson("/api/v1/courses/{$course->slug}")->assertNotFound();
        $this->withToken($token)->getJson('/api/v1/admin/courses?status=hidden')->assertOk()
            ->assertJsonPath('data.0.id', $course->id);
    }

    public function test_deleting_a_course_with_students_suggests_hiding_it(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['course_id' => $course->id]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->deleteJson("/api/v1/admin/courses/{$course->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Không thể xóa khóa học đã có học viên đăng ký. Hãy ẩn khóa học thay vì xóa.');
    }

    public function test_question_rejects_more_than_four_options(): void
    {
        $admin = User::factory()->admin()->create();
        $exam = Exam::factory()->create();
        $options = collect(range(1, 5))->map(fn (int $i) => ['content' => "Phương án {$i}", 'is_correct' => $i === 1])->all();

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->postJson("/api/v1/admin/quizzes/{$exam->id}/questions", ['content' => 'Câu hỏi?', 'options' => $options])
            ->assertUnprocessable()
            ->assertJsonPath('errors.options.0', 'Mỗi câu hỏi có tối đa 4 phương án.');
    }

    public function test_admin_review_list_names_the_course(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create(['title' => 'SEO nền tảng']);
        Review::factory()->create(['course_id' => $course->id]);

        $this->withToken($admin->createToken('test')->plainTextToken)->getJson('/api/v1/admin/reviews')->assertOk()
            ->assertJsonPath('data.0.course.id', $course->id)
            ->assertJsonPath('data.0.course.title', 'SEO nền tảng');
    }

    public function test_duplicate_category_and_course_names_are_reported_in_vietnamese(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $category = Category::factory()->create(['name' => 'Google Ads']);
        Course::factory()->create(['title' => 'SEO nền tảng', 'category_id' => $category->id]);

        $this->withToken($token)->postJson('/api/v1/admin/categories', ['name' => 'Google Ads'])
            ->assertUnprocessable()->assertJsonPath('errors.name.0', 'Tên danh mục đã tồn tại.');

        $this->withToken($token)->postJson('/api/v1/admin/courses', [
            'category_id' => $category->id, 'title' => 'SEO nền tảng', 'price' => 0, 'status' => 'draft',
        ])->assertUnprocessable()->assertJsonPath('errors.title.0', 'Tiêu đề khóa học đã tồn tại.');
    }

    public function test_admin_configures_exam_duration_and_deletes_an_exam_without_attempts(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $course = Course::factory()->create();

        $this->withToken($token)->postJson("/api/v1/admin/courses/{$course->id}/quiz", [
            'title' => 'Bài kiểm tra cuối khóa', 'pass_score' => 75, 'max_attempts' => 3, 'duration_minutes' => 45,
        ])->assertOk()->assertJsonPath('duration_minutes', 45);

        $this->withToken($token)->getJson("/api/v1/admin/courses/{$course->id}")->assertOk()
            ->assertJsonPath('data.quiz.duration_minutes', 45);

        $exam = $course->exam()->firstOrFail();
        $question = Question::factory()->create(['exam_id' => $exam->id]);
        Answer::factory()->correct()->create(['question_id' => $question->id]);

        $this->withToken($token)->deleteJson("/api/v1/admin/courses/{$course->id}/quiz")->assertNoContent();
        $this->assertDatabaseMissing('exams', ['id' => $exam->id]);
        $this->assertDatabaseMissing('questions', ['id' => $question->id]);
    }

    public function test_exam_with_attempts_cannot_be_deleted(): void
    {
        [, $course, , , , $studentToken] = $this->completedCourseWithExam(3);
        $this->withToken($studentToken)->postJson("/api/v1/my/courses/{$course->id}/quiz/attempts/start")->assertOk();
        $admin = User::factory()->admin()->create();
        // RequestGuard caches the student resolved above; drop it so the admin token is re-resolved.
        $this->app['auth']->forgetGuards();

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->deleteJson("/api/v1/admin/courses/{$course->id}/quiz")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Không thể xóa bài kiểm tra vì đã có lượt làm bài của học viên.');
    }

    /** @return array{0: User, 1: Course, 2: Exam, 3: Question, 4: Answer, 5: string} */
    private function completedCourseWithExam(int $maxAttempts = 3): array
    {
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $enrollment = Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => 1]);
        LearningProgress::create(['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id, 'is_completed' => true, 'completed_at' => now()]);
        $exam = Exam::factory()->create(['course_id' => $course->id, 'pass_score' => 75, 'max_attempts' => $maxAttempts, 'duration_minutes' => 20]);
        $question = Question::factory()->create(['exam_id' => $exam->id]);
        $correct = Answer::factory()->correct()->create(['question_id' => $question->id]);
        Answer::factory()->create(['question_id' => $question->id]);

        return [$student, $course, $exam, $question, $correct, $student->createToken('test')->plainTextToken];
    }
}
