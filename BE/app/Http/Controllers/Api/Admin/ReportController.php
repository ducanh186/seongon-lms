<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Order;
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
