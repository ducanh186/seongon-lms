<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Course;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

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
}
