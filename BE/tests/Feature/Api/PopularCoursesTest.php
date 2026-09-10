<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PopularCoursesTest extends TestCase
{
    use RefreshDatabase;

    public function test_courses_without_enrollments_do_not_fill_the_ranking(): void
    {
        $this->actingAs(User::factory()->admin()->create(), 'sanctum');
        Course::factory()->count(6)->create();
        $this->getJson('/api/v1/admin/dashboard/stats')->assertOk()
            ->assertJsonPath('popular_courses', [])->assertJsonPath('enrollments', 0);
    }

    public function test_three_enrolled_courses_return_three_rows_with_real_ties_and_current_status_rules(): void
    {
        $this->actingAs(User::factory()->admin()->create(), 'sanctum');
        $beta = Course::factory()->create(['title' => 'Beta', 'status' => 'draft']);
        $alpha = Course::factory()->create(['title' => 'Alpha', 'status' => 'published']);
        $gamma = Course::factory()->create(['title' => 'Gamma']);
        Course::factory()->count(3)->create();
        Enrollment::factory()->count(3)->create(['course_id' => $beta->id]);
        Enrollment::factory()->count(3)->create(['course_id' => $alpha->id]);
        Enrollment::factory()->create(['course_id' => $gamma->id, 'status' => 'expired']);

        foreach (range(1, 2) as $reload) {
            $this->getJson('/api/v1/admin/dashboard/stats')->assertOk()
                ->assertJsonPath('enrollments', 7)
                ->assertJsonPath('popular_courses', [
                    ['id' => $alpha->id, 'title' => 'Alpha', 'enrollments_count' => 3],
                    ['id' => $beta->id, 'title' => 'Beta', 'enrollments_count' => 3],
                    ['id' => $gamma->id, 'title' => 'Gamma', 'enrollments_count' => 1],
                ]);
        }
        Enrollment::factory()->create(['course_id' => $beta->id]);
        $this->getJson('/api/v1/admin/dashboard/stats')->assertOk()
            ->assertJsonPath('enrollments', 8)->assertJsonPath('popular_courses.0.id', $beta->id)
            ->assertJsonPath('popular_courses.0.enrollments_count', 4);
    }

    public function test_ranking_returns_only_the_five_largest_counts(): void
    {
        $this->actingAs(User::factory()->admin()->create(), 'sanctum');
        foreach ([2, 7, 1, 9, 4, 6] as $count) {
            $course = Course::factory()->create();
            Enrollment::factory()->count($count)->create(['course_id' => $course->id]);
        }
        $response = $this->getJson('/api/v1/admin/dashboard/stats')->assertOk()
            ->assertJsonPath('enrollments', 29)->assertJsonCount(5, 'popular_courses');
        $this->assertSame([9, 7, 6, 4, 2], array_column($response->json('popular_courses'), 'enrollments_count'));
    }
}
