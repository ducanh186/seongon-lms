<?php

namespace Tests\Feature\Api;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AdminReportExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_exports_all_enrollments_as_utf8_csv(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create(['name' => 'Nguyễn Văn An', 'email' => 'an@example.test']);
        $course = Course::factory()->create(['title' => 'SEO thực chiến']);
        Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'enrolled_at' => '2026-09-01 08:30:00',
            'expires_at' => '2027-09-01 08:30:00',
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->get('/api/v1/admin/reports/enrollments');

        $response->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $rows = array_map('str_getcsv', preg_split('/\r?\n/', trim(substr($content, 3))));
        $this->assertSame(['Mã ghi danh', 'Học viên', 'Email', 'Khóa học', 'Ngày ghi danh', 'Hết hạn', 'Trạng thái'], $rows[0]);
        $this->assertSame(['1', 'Nguyễn Văn An', 'an@example.test', 'SEO thực chiến'], array_slice($rows[1], 0, 4));
    }

    public function test_admin_exports_paid_revenue_without_pending_orders(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create(['name' => 'Trần Minh', 'email' => 'minh@example.test']);
        $course = Course::factory()->create(['title' => 'Google Ads']);
        Order::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'amount' => 1250000,
            'status' => 'paid',
            'payment_method' => 'bank',
            'paid_at' => '2026-09-02 10:00:00',
        ]);
        Order::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'amount' => 999000,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->get('/api/v1/admin/reports/revenue');

        $response->assertOk();
        $content = $response->streamedContent();
        $rows = array_map('str_getcsv', preg_split('/\r?\n/', trim(substr($content, 3))));
        $this->assertSame(['Mã đơn', 'Học viên', 'Email', 'Khóa học', 'Số tiền', 'Phương thức', 'Ngày thanh toán'], $rows[0]);
        $this->assertSame(['1', 'Trần Minh', 'minh@example.test', 'Google Ads', '1250000.00', 'bank'], array_slice($rows[1], 0, 6));
        $this->assertStringNotContainsString('999000', $content);
    }

    public function test_student_cannot_export_admin_reports(): void
    {
        $student = User::factory()->create();

        $this->actingAs($student, 'sanctum')
            ->get('/api/v1/admin/reports/enrollments')
            ->assertForbidden();
    }

    public function test_admin_can_download_all_reports_as_fresh_pdfs_from_database(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create(['name' => 'Học viên PDF']);
        $course = Course::factory()->create([
            'title' => 'Khóa học PDF động',
            'status' => 'published',
        ]);
        $enrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);
        Certificate::create([
            'enrollment_id' => $enrollment->id,
            'certificate_code' => 'PDF-DYNAMIC-001',
            'issued_at' => now(),
        ]);
        Order::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'amount' => 1500000,
            'status' => 'paid',
            'payment_method' => 'bank',
            'paid_at' => now(),
        ]);

        foreach (['enrollments', 'completion', 'courses', 'popular-courses', 'revenue'] as $report) {
            $response = $this->actingAs($admin, 'sanctum')
                ->get("/api/v1/admin/reports/{$report}/pdf");

            $response->assertOk()->assertHeader('content-type', 'application/pdf');
            $this->assertStringStartsWith('%PDF', $response->getContent());
        }
    }

    public function test_pdf_export_raises_the_memory_limit_required_by_dompdf(): void
    {
        $previousMemoryLimit = ini_get('memory_limit');
        ini_set('memory_limit', '128M');

        try {
            $admin = User::factory()->admin()->create();
            $response = $this->actingAs($admin, 'sanctum')
                ->get('/api/v1/admin/reports/enrollments/pdf');

            $response->assertOk();
            $this->assertSame('512M', ini_get('memory_limit'));
        } finally {
            if ($previousMemoryLimit !== false) {
                ini_set('memory_limit', $previousMemoryLimit);
            }
        }
    }

    public function test_pdf_report_contains_current_database_values_each_time_it_is_generated(): void
    {
        Carbon::setTestNow('2026-09-12 10:00:00');
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create(['title' => 'Tên khóa học trước khi đổi']);

        $first = $this->actingAs($admin, 'sanctum')
            ->get('/api/v1/admin/reports/courses/pdf')
            ->getContent();

        $course->update(['title' => 'Tên khóa học sau khi đổi']);

        $second = $this->actingAs($admin, 'sanctum')
            ->get('/api/v1/admin/reports/courses/pdf')
            ->getContent();

        Carbon::setTestNow();
        $this->assertNotSame($first, $second);
    }

    public function test_pdf_reports_apply_an_inclusive_date_range(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        $insideCourse = Course::factory()->create([
            'created_at' => '2026-09-30 23:59:59',
            'updated_at' => '2026-09-30 23:59:59',
        ]);
        $outsideCourse = Course::factory()->create([
            'created_at' => '2026-10-01 00:00:00',
            'updated_at' => '2026-10-01 00:00:00',
        ]);

        foreach ([
            [$insideCourse, '2026-09-30 23:59:59'],
            [$outsideCourse, '2026-10-01 00:00:00'],
        ] as [$course, $date]) {
            Enrollment::factory()->create([
                'user_id' => $student->id,
                'course_id' => $course->id,
                'enrolled_at' => $date,
            ]);
            Order::factory()->create([
                'user_id' => $student->id,
                'course_id' => $course->id,
                'status' => 'paid',
                'paid_at' => $date,
            ]);
        }

        foreach (['enrollments', 'completion', 'courses', 'popular-courses', 'revenue'] as $report) {
            $this->actingAs($admin, 'sanctum')
                ->get("/api/v1/admin/reports/{$report}/pdf?from_date=2026-09-01&to_date=2026-09-30")
                ->assertOk()
                ->assertHeader('X-Report-Row-Count', '1');
        }
    }

    public function test_pdf_report_rejects_an_inverted_date_range(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/enrollments/pdf?from_date=2026-09-30&to_date=2026-09-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('to_date');
    }
}
