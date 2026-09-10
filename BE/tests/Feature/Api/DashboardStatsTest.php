<?php

namespace Tests\Feature\Api;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_six_calendar_months_use_created_at_and_include_zero_months_across_year_boundary(): void
    {
        $this->travelTo(now()->setDate(2026, 1, 15)->startOfDay());
        $this->actingAs(User::factory()->admin()->create(), 'sanctum');
        foreach (['2025-07-31 23:59:59', '2025-08-01 00:00:00', '2025-10-31 23:59:59', '2026-01-01 00:00:00', '2026-02-01 00:00:00'] as $date) {
            Enrollment::factory()->create(['created_at' => $date, 'enrolled_at' => '2020-01-01']);
        }

        $this->getJson('/api/v1/admin/dashboard/stats')->assertOk()->assertJsonPath('monthly_enrollments', [
            ['month' => '2025-08', 'total' => 1],
            ['month' => '2025-09', 'total' => 0],
            ['month' => '2025-10', 'total' => 1],
            ['month' => '2025-11', 'total' => 0],
            ['month' => '2025-12', 'total' => 0],
            ['month' => '2026-01', 'total' => 1],
        ]);
    }

    public function test_kpis_and_status_counts_are_refreshed_from_the_database(): void
    {
        $this->actingAs(User::factory()->admin()->create(), 'sanctum');
        $student = User::factory()->create();
        $course = Course::factory()->create(['status' => 'draft']);
        $this->getJson('/api/v1/admin/dashboard/stats')->assertOk()
            ->assertJsonPath('students', 1)->assertJsonPath('courses', 1)
            ->assertJsonPath('published_courses', 0)->assertJsonPath('draft_courses', 1)
            ->assertJsonPath('enrollments', 0)->assertJsonPath('completion_rate', 0)
            ->assertJsonPath('revenue', 0);

        $course->update(['status' => 'published']);
        $order = Order::factory()->create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'paid', 'amount' => 250000]);
        Order::factory()->create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'pending', 'amount' => 900000]);
        Order::factory()->create(['user_id' => $student->id, 'course_id' => $course->id, 'status' => 'failed', 'amount' => 800000]);
        $enrollment = Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id, 'order_id' => $order->id]);
        Certificate::create(['enrollment_id' => $enrollment->id, 'certificate_code' => 'STATS-TEST', 'issued_at' => now()]);

        $this->getJson('/api/v1/admin/dashboard/stats')->assertOk()
            ->assertJsonPath('students', 1)->assertJsonPath('courses', 1)
            ->assertJsonPath('published_courses', 1)->assertJsonPath('draft_courses', 0)
            ->assertJsonPath('enrollments', 1)->assertJsonPath('certificates', 1)
            ->assertJsonPath('completion_rate', 100)->assertJsonPath('revenue', 250000);
    }
}
