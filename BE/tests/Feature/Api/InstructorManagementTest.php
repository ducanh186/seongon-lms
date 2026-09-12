<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Instructor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstructorManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_administrators_can_manage_instructors(): void
    {
        $student = User::factory()->create();
        $instructor = Instructor::factory()->create();

        $this->getJson('/api/v1/admin/instructors')->assertUnauthorized();

        $this->actingAs($student, 'sanctum')
            ->deleteJson("/api/v1/admin/instructors/{$instructor->id}")
            ->assertForbidden();
    }

    public function test_admin_can_list_instructors_alphabetically_with_course_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $zulu = Instructor::factory()->create(['name' => 'Zulu Teacher']);
        $alpha = Instructor::factory()->create(['name' => 'Alpha Teacher']);
        Course::factory()->count(2)->create(['instructor_id' => $alpha->id]);
        Course::factory()->create(['instructor_id' => $zulu->id]);

        $this->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/instructors')
            ->assertOk()
            ->assertJsonPath('data.0.id', $alpha->id)
            ->assertJsonPath('data.0.name', 'Alpha Teacher')
            ->assertJsonPath('data.0.courses_count', 2)
            ->assertJsonPath('data.1.id', $zulu->id)
            ->assertJsonPath('data.1.courses_count', 1)
            ->assertJsonStructure(['data' => [['id', 'name', 'bio', 'courses_count', 'created_at', 'updated_at']]]);
    }

    public function test_admin_can_create_an_instructor(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')->postJson('/api/v1/admin/instructors', [
            'name' => 'Nguyễn Minh Anh',
            'bio' => 'Chuyên gia phân tích dữ liệu.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Nguyễn Minh Anh')
            ->assertJsonPath('data.bio', 'Chuyên gia phân tích dữ liệu.')
            ->assertJsonPath('data.courses_count', 0);

        $this->assertDatabaseHas('instructors', [
            'name' => 'Nguyễn Minh Anh',
            'bio' => 'Chuyên gia phân tích dữ liệu.',
        ]);
    }

    public function test_instructor_name_must_be_unique_when_creating_or_updating(): void
    {
        $admin = User::factory()->admin()->create();
        $existing = Instructor::factory()->create(['name' => 'Existing Instructor']);
        $other = Instructor::factory()->create(['name' => 'Other Instructor']);

        $this->actingAs($admin, 'sanctum')->postJson('/api/v1/admin/instructors', [
            'name' => 'Existing Instructor',
        ])->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->actingAs($admin, 'sanctum')->putJson("/api/v1/admin/instructors/{$other->id}", [
            'name' => $existing->name,
            'bio' => $other->bio,
        ])->assertUnprocessable()->assertJsonValidationErrors('name');
    }

    public function test_admin_update_synchronizes_linked_course_snapshots(): void
    {
        $admin = User::factory()->admin()->create();
        $instructor = Instructor::factory()->create([
            'name' => 'Old Name',
            'bio' => 'Old biography.',
        ]);
        $firstCourse = Course::factory()->create([
            'instructor_id' => $instructor->id,
            'instructor_name' => 'Old Name',
            'instructor_bio' => 'Old biography.',
        ]);
        $secondCourse = Course::factory()->create([
            'instructor_id' => $instructor->id,
            'instructor_name' => 'Old Name',
            'instructor_bio' => 'Old biography.',
        ]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/v1/admin/instructors/{$instructor->id}", [
            'name' => 'New Name',
            'bio' => 'New biography.',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.bio', 'New biography.');

        foreach ([$firstCourse->id, $secondCourse->id] as $courseId) {
            $this->assertDatabaseHas('courses', [
                'id' => $courseId,
                'instructor_id' => $instructor->id,
                'instructor_name' => 'New Name',
                'instructor_bio' => 'New biography.',
            ]);
        }
    }

    public function test_admin_cannot_delete_an_instructor_referenced_by_courses(): void
    {
        $admin = User::factory()->admin()->create();
        $instructor = Instructor::factory()->create();
        Course::factory()->count(2)->create(['instructor_id' => $instructor->id]);

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/admin/instructors/{$instructor->id}")
            ->assertStatus(409)
            ->assertJsonPath('code', 'resource_has_dependencies')
            ->assertJsonPath('dependencies.courses', 2);

        $this->assertDatabaseHas('instructors', ['id' => $instructor->id]);
    }

    public function test_admin_can_delete_an_unreferenced_instructor(): void
    {
        $admin = User::factory()->admin()->create();
        $instructor = Instructor::factory()->create();

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/admin/instructors/{$instructor->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('instructors', ['id' => $instructor->id]);
    }
}
