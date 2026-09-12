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
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_uploads_a_course_thumbnail_from_their_computer(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin, 'sanctum')->post('/api/v1/admin/courses/images', [
            'image' => UploadedFile::fake()->image('course-thumbnail.jpg', 1200, 675),
        ]);

        $response->assertCreated()
            ->assertJsonPath('url', fn ($url) => str_starts_with($url, '/storage/course-images/'));
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $response->json('url')));
    }

    public function test_admin_can_set_the_quiz_close_time(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/admin/courses/{$course->id}/quiz", [
            'title' => 'Kiem tra cuoi khoa',
            'pass_score' => 75,
            'max_attempts' => 2,
            'closes_at' => '2026-12-31T16:59:00+07:00',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('exams', [
            'course_id' => $course->id,
            'max_attempts' => 2,
            'closes_at' => '2026-12-31 09:59:00',
        ]);
    }

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
            ->assertJsonCount(6, 'monthly_enrollments');

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

    public function test_admin_course_list_includes_real_business_fields_and_aggregates(): void
    {
        $admin = User::factory()->admin()->create();
        $primary = Category::factory()->create(['name' => 'SEO']);
        $secondary = Category::factory()->create(['name' => 'Analytics']);
        $course = Course::factory()->create([
            'category_id' => $primary->id,
            'instructor_name' => 'SEONGON Mentor',
        ]);
        $course->categories()->attach($secondary->id);
        Lesson::factory()->count(2)->create(['course_id' => $course->id]);
        $quiz = Exam::factory()->create(['course_id' => $course->id]);
        Question::factory()->count(3)->create(['exam_id' => $quiz->id]);
        Enrollment::factory()->count(4)->create(['course_id' => $course->id]);
        Review::factory()->create(['course_id' => $course->id, 'rating' => 4]);
        Review::factory()->create(['course_id' => $course->id, 'rating' => 5]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/courses')
            ->assertOk()
            ->assertJsonPath('data.0.id', $course->id)
            ->assertJsonPath('data.0.instructor_name', 'SEONGON Mentor')
            ->assertJsonCount(2, 'data.0.categories')
            ->assertJsonPath('data.0.lessons_count', 2)
            ->assertJsonPath('data.0.questions_count', 3)
            ->assertJsonPath('data.0.exam_exists', true)
            ->assertJsonPath('data.0.enrollments_count', 4)
            ->assertJsonPath('data.0.rating', 4.5)
            ->assertJsonPath('data.0.updated_at', $course->updated_at->toJSON());
    }

    public function test_admin_create_and_update_syncs_multiple_course_categories(): void
    {
        $admin = User::factory()->admin()->create();
        $first = Category::factory()->create();
        $second = Category::factory()->create();
        $third = Category::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $create = $this->withToken($token)->postJson('/api/v1/admin/courses', [
            'category_ids' => [$first->id, $second->id],
            'title' => 'Multi category course',
            'price' => 299000,
            'level' => 'beginner',
            'status' => 'draft',
        ]);

        $create->assertCreated()
            ->assertJsonCount(2, 'data.categories')
            ->assertJsonPath('data.categories.0.id', $first->id)
            ->assertJsonPath('data.categories.1.id', $second->id);

        $courseId = $create->json('data.id');
        $this->assertDatabaseHas('courses', ['id' => $courseId, 'category_id' => $first->id]);
        $this->assertDatabaseHas('course_categories', ['course_id' => $courseId, 'category_id' => $first->id]);
        $this->assertDatabaseHas('course_categories', ['course_id' => $courseId, 'category_id' => $second->id]);

        $update = $this->withToken($token)->putJson("/api/v1/admin/courses/{$courseId}", [
            'category_ids' => [$second->id, $third->id],
            'title' => 'Updated multi category course',
            'price' => 399000,
            'level' => 'intermediate',
            'status' => 'published',
        ]);

        $update->assertOk()
            ->assertJsonCount(2, 'data.categories')
            ->assertJsonPath('data.categories.0.id', $second->id)
            ->assertJsonPath('data.categories.1.id', $third->id);

        $this->assertDatabaseHas('courses', ['id' => $courseId, 'category_id' => $second->id]);
        $this->assertDatabaseMissing('course_categories', ['course_id' => $courseId, 'category_id' => $first->id]);
        $this->assertDatabaseHas('course_categories', ['course_id' => $courseId, 'category_id' => $second->id]);
        $this->assertDatabaseHas('course_categories', ['course_id' => $courseId, 'category_id' => $third->id]);
    }

    public function test_admin_user_list_includes_each_students_enrollment_count(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create(['email' => 'enrolled-student@example.test']);
        $firstCourse = Course::factory()->create();
        $secondCourse = Course::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $firstCourse->id]);
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $secondCourse->id]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/users?q=enrolled-student%40example.test')
            ->assertOk()
            ->assertJsonPath('data.0.enrollments_count', 2);
    }

    public function test_admin_account_list_includes_all_roles_and_can_update_a_users_role(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin-list@example.test']);
        $student = User::factory()->create(['email' => 'student-list@example.test']);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonFragment(['email' => 'admin-list@example.test', 'role' => 'admin'])
            ->assertJsonFragment(['email' => 'student-list@example.test', 'role' => 'student']);

        $this->withToken($token)->patchJson("/api/v1/admin/users/{$student->id}/role", ['role' => 'admin'])
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');

        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'role' => 'admin',
            'role_id' => Role::query()->where('code', 'admin')->value('id'),
        ]);
    }

    public function test_admin_account_list_places_administrators_and_teachers_before_students(): void
    {
        $firstAdmin = User::factory()->admin()->create(['email' => 'admin-first@example.test']);
        User::factory()->admin()->create(['email' => 'admin-second@example.test']);
        User::factory()->teacher()->create(['email' => 'teacher@example.test']);
        User::factory()->create(['email' => 'student-newest@example.test']);
        $token = $firstAdmin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'admin-second@example.test')
            ->assertJsonPath('data.1.email', 'admin-first@example.test')
            ->assertJsonPath('data.2.email', 'teacher@example.test')
            ->assertJsonPath('data.3.email', 'student-newest@example.test');
    }

    public function test_admin_can_filter_accounts_by_role_and_open_account_detail(): void
    {
        $admin = User::factory()->admin()->create();
        $teacherRole = Role::query()->where('code', 'teacher')->firstOrCreate([
            'code' => 'teacher',
        ], ['name' => 'Giảng viên', 'description' => 'Giảng viên']);
        $teacher = User::factory()->create(['email' => 'teacher-detail@example.test']);
        $teacher->role = 'teacher';
        $teacher->role_id = $teacherRole->id;
        $teacher->save();
        $student = User::factory()->create(['email' => 'student-detail@example.test']);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/users?role=teacher')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.email', $teacher->email)
            ->assertJsonPath('data.0.role', 'teacher');

        $this->withToken($token)->getJson("/api/v1/admin/users/{$teacher->id}")
            ->assertOk()
            ->assertJsonPath('data.email', $teacher->email)
            ->assertJsonPath('data.enrollments_count', 0)
            ->assertJsonPath('data.updated_at', $teacher->updated_at->toJSON());

        $this->withToken($token)->getJson('/api/v1/admin/users?role=student')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.email', $student->email);
    }

    public function test_admin_course_list_supports_the_approved_management_filters(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create(['name' => 'SEO']);
        $course = Course::factory()->create([
            'category_id' => $category->id,
            'title' => 'SEO Filter Target',
            'price' => 499000,
            'status' => 'published',
            'updated_at' => '2026-08-20 10:00:00',
        ]);
        Course::factory()->create(['title' => 'Other course', 'price' => 499000]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/courses?category_id='.$category->id.'&course_id='.$course->id.'&q=Filter&status=published&price=499000&published_on=2026-08-20')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $course->id)
            ->assertJsonPath('data.0.published_at', '2026-08-20T10:00:00.000000Z');
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

        foreach (range(1, 5) as $questionNumber) {
            $this->withToken($token)->postJson('/api/v1/admin/quizzes/'.$quiz->json('id').'/questions', [
                'content' => "Cau hoi mau {$questionNumber}?",
                'options' => [
                    ['content' => 'Dung', 'is_correct' => true],
                    ['content' => 'Sai', 'is_correct' => false],
                ],
            ])->assertCreated()->assertJsonCount(2, 'options');
        }

        $this->withToken($token)->patchJson("/api/v1/admin/courses/{$courseId}/publish", ['status' => 'published'])
            ->assertOk()->assertJsonPath('data.status', 'published');

        $this->withToken($token)->patchJson("/api/v1/admin/users/{$student->id}/status", [
            'status' => 'locked',
            'reason' => 'Khóa tài khoản thử nghiệm.',
        ])
            ->assertOk()->assertJsonPath('data.status', 'locked');

        $this->withToken($token)->getJson('/api/v1/admin/dashboard/stats')
            ->assertOk()->assertJsonPath('students', 1)->assertJsonPath('courses', 1);
    }

    public function test_admin_status_change_is_recorded_and_can_be_read_for_one_user(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create(['status' => 'active']);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->patchJson("/api/v1/admin/users/{$student->id}/status", [
            'status' => 'locked',
            'reason' => 'Vi phạm quy định lớp học.',
        ])->assertOk()->assertJsonPath('data.status', 'locked');

        $this->assertDatabaseHas('user_records', [
            'user_id' => $student->id,
            'old_status' => 'active',
            'new_status' => 'locked',
            'reason' => 'Vi phạm quy định lớp học.',
        ]);

        $this->withToken($token)->getJson("/api/v1/admin/users/{$student->id}/records")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.old_status', 'active')
            ->assertJsonPath('data.0.new_status', 'locked')
            ->assertJsonPath('data.0.reason', 'Vi phạm quy định lớp học.');
    }

    public function test_admin_can_upload_a_pdf_material_when_creating_a_lesson(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->post("/api/v1/admin/courses/{$course->id}/lessons", [
            'title' => 'Bài học có tài liệu',
            'video_url' => 'https://www.youtube.com/embed/example',
            'material' => UploadedFile::fake()->create('tai-lieu.pdf', 128, 'application/pdf'),
        ]);

        $response->assertCreated();
        $materialUrl = $response->json('data.material_url');

        $this->assertIsString($materialUrl);
        $this->assertStringStartsWith('/storage/lesson-materials/', $materialUrl);
        $this->assertDatabaseHas('lessons', [
            'id' => $response->json('data.id'),
            'material_url' => $materialUrl,
        ]);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $materialUrl));
    }

    public function test_admin_can_manage_a_review_without_a_status_field(): void
    {
        $admin = User::factory()->admin()->create();
        $review = Review::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/admin/reviews')
            ->assertOk()
            ->assertJsonMissingPath('data.0.status');

        $this->withToken($token)
            ->patchJson("/api/v1/admin/reviews/{$review->id}/status", ['status' => 'hidden'])
            ->assertNotFound();

        $this->withToken($token)->deleteJson("/api/v1/admin/reviews/{$review->id}")
            ->assertNoContent();
        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }

    public function test_admin_can_configure_how_many_questions_each_attempt_uses(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->postJson("/api/v1/admin/courses/{$course->id}/quiz", [
            'title' => 'Bài kiểm tra cuối khóa',
            'pass_score' => 75,
            'max_attempts' => 3,
            'total_questions' => 10,
        ]);

        $response->assertOk()->assertJsonPath('total_questions', 10);
        $this->assertDatabaseHas('exams', ['course_id' => $course->id, 'total_questions' => 10]);
    }

    public function test_admin_can_list_reviews_for_one_selected_course(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $matchingReview = Review::factory()->create(['course_id' => $course->id]);
        Review::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/v1/admin/reviews?course_id={$course->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $matchingReview->id)
            ->assertJsonPath('data.0.course_id', $course->id);

        $this->withToken($token)
            ->getJson('/api/v1/admin/reviews?course_id=999999')
            ->assertUnprocessable();
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
