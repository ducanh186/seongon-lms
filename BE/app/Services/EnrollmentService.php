<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Order;

class EnrollmentService
{
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
