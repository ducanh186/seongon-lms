<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Course;
use App\Models\TeacherProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseInstructorIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_create_uses_the_selected_external_teacher_profile(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();
        $instructor = TeacherProfile::query()->create(['name' => 'Catalog Teacher', 'bio' => 'Managed biography.']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/admin/courses', [
            'category_ids' => [$category->id],
            'title' => 'Managed instructor course',
            'price' => 1000,
            'status' => 'draft',
            'teacher_profile_id' => $instructor->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.teacher_profile_id', $instructor->id)
            ->assertJsonPath('data.instructor_name', 'Catalog Teacher')
            ->assertJsonPath('data.instructor_bio', 'Managed biography.');
    }

    public function test_course_update_switches_the_external_teacher_profile(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();
        $old = TeacherProfile::query()->create(['name' => 'Old Teacher', 'bio' => 'Old bio.']);
        $new = TeacherProfile::query()->create(['name' => 'New Teacher', 'bio' => 'New bio.']);
        $course = Course::factory()->create([
            'category_id' => $category->id,
            'teacher_profile_id' => $old->id,
            'instructor_name' => $old->name,
            'instructor_bio' => $old->bio,
        ]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/v1/admin/courses/{$course->id}", [
            'category_ids' => [$category->id],
            'title' => $course->title,
            'price' => $course->price,
            'status' => $course->status,
            'teacher_profile_id' => $new->id,
        ])->assertOk()
            ->assertJsonPath('data.teacher_profile_id', $new->id)
            ->assertJsonPath('data.instructor_name', 'New Teacher')
            ->assertJsonPath('data.instructor_bio', 'New bio.');

        $this->assertDatabaseHas('courses', [
            'id' => $course->id,
            'teacher_profile_id' => $new->id,
            'instructor_name' => 'New Teacher',
            'instructor_bio' => 'New bio.',
        ]);
    }
}
