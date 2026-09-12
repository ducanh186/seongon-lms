<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Course;
use App\Models\Instructor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseInstructorIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_create_copies_the_selected_instructor_snapshot(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();
        $instructor = Instructor::factory()->create(['name' => 'Catalog Teacher', 'bio' => 'Managed biography.']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/admin/courses', [
            'category_ids' => [$category->id],
            'title' => 'Managed instructor course',
            'price' => 1000,
            'status' => 'draft',
            'instructor_id' => $instructor->id,
            'instructor_name' => 'Legacy name must be ignored',
            'instructor_bio' => 'Legacy bio must be ignored',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.instructor_id', $instructor->id)
            ->assertJsonPath('data.instructor_name', 'Catalog Teacher')
            ->assertJsonPath('data.instructor_bio', 'Managed biography.');
    }

    public function test_course_update_copies_the_selected_instructor_snapshot(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();
        $old = Instructor::factory()->create(['name' => 'Old Teacher', 'bio' => 'Old bio.']);
        $new = Instructor::factory()->create(['name' => 'New Teacher', 'bio' => 'New bio.']);
        $course = Course::factory()->create([
            'category_id' => $category->id,
            'instructor_id' => $old->id,
            'instructor_name' => $old->name,
            'instructor_bio' => $old->bio,
        ]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/v1/admin/courses/{$course->id}", [
            'category_ids' => [$category->id],
            'title' => $course->title,
            'price' => $course->price,
            'status' => $course->status,
            'instructor_id' => $new->id,
            'instructor_name' => 'Legacy name must be ignored',
            'instructor_bio' => 'Legacy bio must be ignored',
        ])->assertOk()
            ->assertJsonPath('data.instructor_id', $new->id)
            ->assertJsonPath('data.instructor_name', 'New Teacher')
            ->assertJsonPath('data.instructor_bio', 'New bio.');

        $this->assertDatabaseHas('courses', [
            'id' => $course->id,
            'instructor_id' => $new->id,
            'instructor_name' => 'New Teacher',
            'instructor_bio' => 'New bio.',
        ]);
    }
}
