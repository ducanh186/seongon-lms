<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Course;
use App\Models\CourseCategory;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\Order;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminErdCoverageTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_reads_roles_carts_items_and_filtered_orders(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create([
            'name' => 'Nguyễn Văn An',
            'email' => 'an@example.test',
        ]);
        $course = Course::factory()->create([
            'title' => 'SEO Technical',
            'price' => 399000,
        ]);
        $cart = Cart::query()->create(['user_id' => $student->id]);
        $item = CartItem::query()->create([
            'cart_id' => $cart->id,
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);
        $order = Order::factory()->paid()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/roles?q=student')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.code', 'student')
            ->assertJsonPath('data.0.users_count', 1);

        $this->withToken($token)->getJson('/api/v1/admin/carts?q=an%40example.test&state=non_empty')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $cart->id)
            ->assertJsonPath('data.0.user.id', $student->id)
            ->assertJsonPath('data.0.items_count', 1)
            ->assertJsonPath('data.0.current_total', '399000.00');

        $this->withToken($token)->getJson("/api/v1/admin/cart-items?course_id={$course->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $item->id)
            ->assertJsonPath('data.0.user.id', $student->id)
            ->assertJsonPath('data.0.course.id', $course->id);

        $this->withToken($token)->getJson('/api/v1/admin/orders?q=SEO%20Technical&status=paid')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $order->id);
    }

    public function test_student_cannot_read_new_admin_erd_indexes(): void
    {
        $student = User::factory()->create();
        $token = $student->createToken('test')->plainTextToken;

        foreach ([
            'roles',
            'carts',
            'cart-items',
            'orders',
            'course-categories',
            'learning-progress',
            'questions',
            'answers',
        ] as $endpoint) {
            $this->withToken($token)->getJson("/api/v1/admin/{$endpoint}")->assertForbidden();
        }
    }

    public function test_admin_erd_indexes_reject_unsupported_commerce_filters(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/carts?state=unknown')->assertUnprocessable();
        $this->withToken($token)->getJson('/api/v1/admin/orders?status=unknown')->assertUnprocessable();
    }

    public function test_admin_reads_course_assignments_progress_questions_and_answers(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create([
            'name' => 'Trần Khánh Lan',
            'email' => 'lan@example.test',
        ]);
        $category = Category::factory()->create(['name' => 'SEO']);
        $course = Course::factory()->create(['title' => 'SEO Data Analysis']);
        $assignment = CourseCategory::query()->create([
            'course_id' => $course->id,
            'category_id' => $category->id,
        ]);
        $enrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);
        $lesson = Lesson::factory()->create([
            'course_id' => $course->id,
            'title' => 'Phân tích Search Console',
        ]);
        $exam = Exam::factory()->create([
            'course_id' => $course->id,
            'title' => 'Bài kiểm tra SEO Data',
        ]);
        $question = Question::factory()->create([
            'exam_id' => $exam->id,
            'content' => 'SEO Technical là gì?',
            'sort_order' => 1,
        ]);
        $correct = Answer::factory()->correct()->create([
            'question_id' => $question->id,
            'content' => 'Tối ưu kỹ thuật website',
        ]);
        Answer::factory()->create([
            'question_id' => $question->id,
            'content' => 'Chỉ viết bài mạng xã hội',
        ]);

        DB::table('learning_progress')->insert([
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $lesson->id,
            'is_completed' => true,
            'completed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/v1/admin/course-categories?course_id={$course->id}&category_id={$category->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $assignment->id)
            ->assertJsonPath('data.0.course.id', $course->id)
            ->assertJsonPath('data.0.category.id', $category->id);

        $this->withToken($token)
            ->getJson("/api/v1/admin/learning-progress?course_id={$course->id}&completed=1")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.lesson.id', $lesson->id)
            ->assertJsonPath('data.0.user.id', $student->id)
            ->assertJsonPath('data.0.course.id', $course->id)
            ->assertJsonPath('data.0.is_completed', true);

        $this->withToken($token)
            ->getJson("/api/v1/admin/questions?exam_id={$exam->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $question->id)
            ->assertJsonPath('data.0.answers_count', 2)
            ->assertJsonPath('data.0.course.id', $course->id);

        $this->withToken($token)
            ->getJson("/api/v1/admin/answers?exam_id={$exam->id}&correct=1")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $correct->id)
            ->assertJsonPath('data.0.question.id', $question->id)
            ->assertJsonPath('data.0.is_correct', true);
    }

    public function test_admin_erd_indexes_reject_invalid_learning_filters(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/learning-progress?completed=maybe')->assertUnprocessable();
        $this->withToken($token)->getJson('/api/v1/admin/answers?correct=maybe')->assertUnprocessable();
    }
}
