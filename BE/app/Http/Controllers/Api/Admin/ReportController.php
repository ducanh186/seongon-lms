<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function enrollments(): StreamedResponse
    {
        return $this->download('bao-cao-ghi-danh.csv', function ($stream): void {
            fputcsv($stream, ['Mã ghi danh', 'Học viên', 'Email', 'Khóa học', 'Ngày ghi danh', 'Hết hạn', 'Trạng thái']);

            Enrollment::query()
                ->with(['user:id,name,email', 'course:id,title'])
                ->orderBy('id')
                ->chunkById(500, function ($enrollments) use ($stream): void {
                    foreach ($enrollments as $enrollment) {
                        fputcsv($stream, [
                            $enrollment->id,
                            $enrollment->user?->name,
                            $enrollment->user?->email,
                            $enrollment->course?->title,
                            $enrollment->enrolled_at?->format('d/m/Y H:i'),
                            $enrollment->expires_at?->format('d/m/Y H:i'),
                            $enrollment->status,
                        ]);
                    }
                });
        });
    }

    public function revenue(): StreamedResponse
    {
        return $this->download('bao-cao-doanh-thu.csv', function ($stream): void {
            fputcsv($stream, ['Mã đơn', 'Học viên', 'Email', 'Khóa học', 'Số tiền', 'Phương thức', 'Ngày thanh toán']);

            Order::query()
                ->where('status', 'paid')
                ->with(['user:id,name,email', 'course:id,title'])
                ->orderBy('id')
                ->chunkById(500, function ($orders) use ($stream): void {
                    foreach ($orders as $order) {
                        fputcsv($stream, [
                            $order->id,
                            $order->user?->name,
                            $order->user?->email,
                            $order->course?->title,
                            $order->amount,
                            $order->payment_method,
                            $order->paid_at?->format('d/m/Y H:i'),
                        ]);
                    }
                });
        });
    }

    public function enrollmentsPdf()
    {
        $rows = Enrollment::query()
            ->with(['user:id,name,email', 'course:id,title'])
            ->orderBy('id')
            ->get()
            ->map(fn (Enrollment $enrollment): array => [
                $enrollment->id,
                $enrollment->user?->name ?? '—',
                $enrollment->user?->email ?? '—',
                $enrollment->course?->title ?? '—',
                $enrollment->enrolled_at?->format('d/m/Y H:i') ?? '—',
                $enrollment->expires_at?->format('d/m/Y H:i') ?? '—',
                $enrollment->status,
            ]);

        return $this->pdf('BC-01', 'Báo cáo ghi danh', ['Mã', 'Học viên', 'Email', 'Khóa học', 'Ngày ghi danh', 'Hết hạn', 'Trạng thái'], $rows);
    }

    public function completionPdf()
    {
        $rows = Enrollment::query()
            ->with([
                'user:id,name,email',
                'certificate',
                'course' => fn ($query) => $query->withCount('lessons'),
            ])
            ->withCount(['learningProgress as completed_lessons_count' => fn ($query) => $query->where('is_completed', true)])
            ->orderBy('id')
            ->get()
            ->map(function (Enrollment $enrollment): array {
                $completed = (int) $enrollment->completed_lessons_count;
                $total = (int) ($enrollment->course?->lessons_count ?? 0);
                $state = $enrollment->certificate
                    ? 'Đã cấp'
                    : ($total > 0 && $completed >= $total ? 'Đủ điều kiện' : 'Đang học');

                return [
                    $enrollment->id,
                    $enrollment->user?->name ?? '—',
                    $enrollment->course?->title ?? '—',
                    "{$completed}/{$total}",
                    $state,
                    $enrollment->certificate?->certificate_code ?? '—',
                    $enrollment->certificate?->issued_at?->format('d/m/Y') ?? '—',
                ];
            });

        return $this->pdf('BC-02', 'Báo cáo hoàn thành & chứng chỉ', ['Mã ghi danh', 'Học viên', 'Khóa học', 'Bài học hoàn tất', 'Trạng thái', 'Mã chứng chỉ', 'Ngày cấp'], $rows);
    }

    public function coursesPdf()
    {
        $rows = Course::query()
            ->with('category:id,name')
            ->withCount(['lessons', 'enrollments'])
            ->orderBy('id')
            ->get()
            ->map(fn (Course $course): array => [
                $course->id,
                $course->title,
                $course->category?->name ?? '—',
                $course->status,
                $course->lessons_count,
                $course->enrollments_count,
                number_format((float) $course->price, 0, ',', '.').' đ',
                $course->created_at?->format('d/m/Y') ?? '—',
            ]);

        return $this->pdf('BC-03', 'Báo cáo xuất bản khóa học', ['Mã', 'Khóa học', 'Danh mục', 'Trạng thái', 'Bài học', 'Ghi danh', 'Giá', 'Ngày tạo'], $rows);
    }

    public function popularCoursesPdf()
    {
        $rows = Course::query()
            ->withCount('enrollments')
            ->orderByDesc('enrollments_count')
            ->orderBy('title')
            ->orderBy('id')
            ->get()
            ->values()
            ->map(fn (Course $course, int $index): array => [
                $index + 1,
                $course->title,
                $course->status,
                $course->enrollments_count,
                number_format((float) $course->price, 0, ',', '.').' đ',
            ]);

        return $this->pdf('BC-04', 'Báo cáo khóa học phổ biến', ['Hạng', 'Khóa học', 'Trạng thái', 'Lượt ghi danh', 'Giá'], $rows);
    }

    public function revenuePdf()
    {
        $rows = Order::query()
            ->where('status', 'paid')
            ->with(['user:id,name,email', 'course:id,title'])
            ->orderBy('id')
            ->get()
            ->map(fn (Order $order): array => [
                $order->id,
                $order->user?->name ?? '—',
                $order->user?->email ?? '—',
                $order->course?->title ?? '—',
                number_format((float) $order->amount, 0, ',', '.').' đ',
                $order->payment_method ?? '—',
                $order->paid_at?->format('d/m/Y H:i') ?? '—',
            ]);

        return $this->pdf('BC-05', 'Báo cáo doanh thu', ['Mã đơn', 'Học viên', 'Email', 'Khóa học', 'Số tiền', 'Phương thức', 'Ngày thanh toán'], $rows);
    }

    private function pdf(string $code, string $title, array $columns, Collection $rows)
    {
        $pdf = Pdf::loadView('reports.admin', [
            'code' => $code,
            'title' => $title,
            'generatedAt' => now(),
            'columns' => $columns,
            'rows' => $rows,
            'total' => $rows->count(),
        ])->setPaper('a4', 'landscape');

        return $pdf->download($code.'.pdf');
    }

    private function download(string $filename, callable $writer): StreamedResponse
    {
        return response()->streamDownload(function () use ($writer): void {
            $stream = fopen('php://output', 'wb');
            fwrite($stream, "\xEF\xBB\xBF");
            $writer($stream);
            fclose($stream);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
