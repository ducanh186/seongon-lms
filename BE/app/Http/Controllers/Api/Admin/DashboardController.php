<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Carbon\CarbonImmutable;

class DashboardController extends Controller
{
    public function stats()
    {
        $enrollments = Enrollment::count();
        $certificates = Certificate::count();
        $startMonth = CarbonImmutable::now()->startOfMonth()->subMonths(11);
        $monthlyEnrollments = collect(range(0, 11))->map(function (int $offset) use ($startMonth): array {
            $month = $startMonth->addMonths($offset);

            return [
                'month' => $month->format('Y-m'),
                'total' => Enrollment::query()
                    ->whereBetween('enrolled_at', [$month->startOfMonth(), $month->endOfMonth()])
                    ->count(),
            ];
        });
        $popularCourses = Course::query()
            ->withCount('enrollments')
            ->orderByDesc('enrollments_count')
            ->orderBy('title')
            ->limit(5)
            ->get(['id', 'title'])
            ->map(fn (Course $course): array => [
                'id' => $course->id,
                'title' => $course->title,
                'enrollments_count' => $course->enrollments_count,
            ]);

        return response()->json([
            'students' => User::where('role', 'student')->count(),
            'courses' => Course::count(),
            'published_courses' => Course::where('status', 'published')->count(),
            'enrollments' => $enrollments,
            'certificates' => $certificates,
            'completion_rate' => $enrollments > 0
                ? round($certificates / $enrollments * 100, 1)
                : 0,
            'revenue' => (float) Order::where('status', 'paid')->sum('amount'),
            'monthly_enrollments' => $monthlyEnrollments,
            'popular_courses' => $popularCourses,
        ]);
    }
}
