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
        $query = Enrollment::query()
            ->with([
                'user',
                'course' => fn ($courseQuery) => $courseQuery->withCount('lessons'),
                'order',
                'certificate',
            ])
            ->withCount([
                'learningProgress as completed_lessons_count' => fn ($progressQuery) => $progressQuery->where('is_completed', true),
            ]);

        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->where('course_id', $courseId);
        }

        if ($userId = $filters['user_id'] ?? null) {
            $query->where('user_id', $userId);
        }

        if ($search = $filters['q'] ?? null) {
            $query->where(function ($enrollmentQuery) use ($search): void {
                $enrollmentQuery
                    ->whereHas('user', function ($userQuery) use ($search): void {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('course', fn ($courseQuery) => $courseQuery->where('title', 'like', "%{$search}%"));
            });
        }

        return $query->latest()->paginate(15)->withQueryString();
    }

    public function forAdmin(Enrollment $enrollment): Enrollment
    {
        return $enrollment
            ->load([
                'user',
                'course' => fn ($courseQuery) => $courseQuery->withCount('lessons'),
                'order',
                'certificate',
            ])
            ->loadCount([
                'learningProgress as completed_lessons_count' => fn ($progressQuery) => $progressQuery->where('is_completed', true),
            ]);
    }

    /**
     * Tạo (hoặc gia hạn) enrollment sau khi đơn hàng thanh toán thành công.
     * Thời hạn truy cập: 730 ngày (2 năm) kể từ thời điểm đăng ký — UC-06 / Appendix B.2.
     */
    public function createFromOrder(Order $order): Enrollment
    {
        $now = now();

        return Enrollment::updateOrCreate(
            ['user_id' => $order->user_id, 'course_id' => $order->course_id],
            [
                'order_id' => $order->id,
                'enrolled_at' => $now,
                'expires_at' => $now->copy()->addDays(730),
                'status' => 'active',
            ],
        );
    }
}
