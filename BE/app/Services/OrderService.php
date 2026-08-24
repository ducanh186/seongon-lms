<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class OrderService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateForAdmin(array $filters = []): LengthAwarePaginator
    {
        $query = Order::query()->with(['user', 'course']);

        if ($orderId = $filters['order_id'] ?? null) {
            $query->whereKey($orderId);
        }

        if ($search = $filters['q'] ?? null) {
            $query->where(function (Builder $orderQuery) use ($search): void {
                $orderQuery
                    ->whereHas('user', function (Builder $userQuery) use ($search): void {
                        $userQuery->where(function (Builder $identityQuery) use ($search): void {
                            $identityQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                    })
                    ->orWhereHas('course', fn (Builder $courseQuery) => $courseQuery->where('title', 'like', "%{$search}%"));
            });
        }

        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->where('course_id', $courseId);
        }

        if ($userId = $filters['user_id'] ?? null) {
            $query->where('user_id', $userId);
        }

        if ($courseTitle = $filters['course_title'] ?? null) {
            $query->whereHas('course', fn (Builder $courseQuery) => $courseQuery->where('title', 'like', "%{$courseTitle}%"));
        }

        if ($student = $filters['student'] ?? null) {
            $query->whereHas('user', function (Builder $userQuery) use ($student): void {
                $userQuery->where(function (Builder $identityQuery) use ($student): void {
                    $identityQuery->where('name', 'like', "%{$student}%")
                        ->orWhere('email', 'like', "%{$student}%");
                });
            });
        }

        if ($createdOn = $filters['created_on'] ?? null) {
            $query->whereDate('created_at', $createdOn);
        }

        return $query->latest()->paginate(15)->withQueryString();
    }

    public function forAdmin(Order $order): Order
    {
        return $order->load(['user', 'course']);
    }
}
