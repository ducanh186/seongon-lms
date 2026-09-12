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

        if ($paymentStatus = $filters['payment_status'] ?? null) {
            if ($paymentStatus === 'paid' || $paymentStatus === 'cancelled') {
                $query->where('status', $paymentStatus === 'paid' ? 'paid' : 'failed');
            } else {
                $query->where('status', 'pending');
                if ($paymentStatus === 'expired') {
                    $query->where('payment_expires_at', '<', now());
                } else {
                    $query->where(fn (Builder $q) => $q->whereNull('payment_expires_at')->orWhere('payment_expires_at', '>=', now()));
                    if ($paymentStatus === 'draft') {
                        $query->whereNull('payment_started_at')->whereNull('transaction_ref');
                    } else {
                        $query->where(fn (Builder $q) => $q->whereNotNull('payment_started_at')->orWhereNotNull('transaction_ref'));
                    }
                }
            }
        }

        if ($paymentResult = $filters['payment_result'] ?? null) {
            if ($paymentResult === 'paid') {
                $query->where('status', 'paid');
            } elseif ($paymentResult === 'failed') {
                $query->where(fn (Builder $q) => $q->where('status', 'failed')
                    ->orWhere(fn (Builder $expired) => $expired->where('status', 'pending')->where('payment_expires_at', '<', now())));
            } else {
                $query->where(fn (Builder $q) => $q->whereIn('status', ['paid', 'failed'])
                    ->orWhere(fn (Builder $expired) => $expired->where('status', 'pending')->where('payment_expires_at', '<', now())));
            }
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
