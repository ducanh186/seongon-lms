<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
