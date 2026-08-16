<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class OrderService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateForAdmin(array $filters = []): LengthAwarePaginator
    {
        $query = Order::query()->with(['user', 'course']);

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

    public function forAdmin(Order $order): Order
    {
        return $order->load(['user', 'course']);
    }
}
