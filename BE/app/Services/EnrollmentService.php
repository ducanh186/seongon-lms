<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class EnrollmentService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateForAdmin(array $filters = []): LengthAwarePaginator
    {
        $query = Enrollment::query()->with(['user', 'course', 'order']);

        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->where('course_id', $courseId);
        }

        if ($userId = $filters['user_id'] ?? null) {
            $query->where('user_id', $userId);
        }

        return $query->latest()->paginate(15)->withQueryString();
    }

    public function forAdmin(Enrollment $enrollment): Enrollment
    {
        return $enrollment->load(['user', 'course', 'order']);
    }

    /**
     * Tạo (hoặc gia hạn) enrollment sau khi đơn hàng thanh toán thành công.
     * Thời hạn truy cập: 1 năm kể từ thời điểm đăng ký.
     */
    public function createFromOrder(Order $order): Enrollment
    {
        $now = now();

        return Enrollment::updateOrCreate(
            ['user_id' => $order->user_id, 'course_id' => $order->course_id],
            [
                'order_id' => $order->id,
                'enrolled_at' => $now,
                'expires_at' => $now->copy()->addYear(),
                'status' => 'active',
            ],
        );
    }
}
