<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $filters = $request->validate([
            'period' => ['nullable', Rule::in(['week', 'month', 'year'])],
        ]);
        $period = $filters['period'] ?? 'all';
        $now = CarbonImmutable::now();
        $start = match ($period) {
            'week' => $now->startOfWeek(),
            'month' => $now->startOfMonth(),
            'year' => $now->startOfYear(),
            default => null,
        };
        // UC-22 alternative flow: every flow metric is recomputed for the period.
        $inPeriod = fn (Builder $query): Builder => $start ? $query->where('created_at', '>=', $start) : $query;

        $enrollments = $inPeriod(Enrollment::query())->count();
        $certificates = $inPeriod(Certificate::query())->count();

        $startMonth = $now->startOfMonth()->subMonths(5);
        $monthlyEnrollments = collect(range(0, 5))->map(function (int $offset) use ($startMonth): array {
            $month = $startMonth->addMonths($offset);

            return [
                'month' => $month->format('Y-m'),
                'total' => Enrollment::query()
                    ->where('created_at', '>=', $month)
                    ->where('created_at', '<', $month->addMonth())
                    ->count(),
            ];
        });

        $popularCourses = Course::query()
            ->whereHas('enrollments', $inPeriod)
            ->withCount(['enrollments' => $inPeriod])
            ->orderByDesc('enrollments_count')
            ->orderBy('title')
            ->orderBy('id')
            ->limit(5)
            ->get(['id', 'title'])
            ->map(fn (Course $course): array => [
                'id' => $course->id,
                'title' => $course->title,
                'enrollments_count' => $course->enrollments_count,
            ]);

        return response()->json([
            'period' => $period,
            'students' => $inPeriod(User::query()->where('role', 'student'))->count(),
            'courses' => Course::count(),
            'published_courses' => Course::where('status', 'published')->count(),
            'draft_courses' => Course::where('status', 'draft')->count(),
            'enrollments' => $enrollments,
            'certificates' => $certificates,
            'completion_rate' => $enrollments > 0
                ? round($certificates / $enrollments * 100, 1)
                : 0,
            'revenue' => (float) $inPeriod(Order::query()->where('status', 'paid'))->sum('amount'),
            'monthly_enrollments' => $monthlyEnrollments,
            'registrations_over_time' => $this->registrationBuckets($period, $now),
            'popular_courses' => $popularCourses,
        ]);
    }

    /**
     * UC-22 step 3: chart of Student registrations over time.
     *
     * @return list<array{label: string, total: int}>
     */
    private function registrationBuckets(string $period, CarbonImmutable $now): array
    {
        [$buckets, $format] = match ($period) {
            'week' => [collect(range(0, 6))->map(fn (int $day) => [$now->startOfWeek()->addDays($day), $now->startOfWeek()->addDays($day + 1)]), 'd/m'],
            'month' => [collect(range(0, $now->daysInMonth - 1))->map(fn (int $day) => [$now->startOfMonth()->addDays($day), $now->startOfMonth()->addDays($day + 1)]), 'd/m'],
            'year' => [collect(range(0, 11))->map(fn (int $month) => [$now->startOfYear()->addMonths($month), $now->startOfYear()->addMonths($month + 1)]), 'm/Y'],
            default => [collect(range(0, 5))->map(fn (int $offset) => [$now->startOfMonth()->subMonths(5 - $offset), $now->startOfMonth()->subMonths(4 - $offset)]), 'm/Y'],
        };

        return $buckets->map(fn (array $range): array => [
            'label' => $range[0]->format($format),
            'total' => User::query()
                ->where('role', 'student')
                ->where('created_at', '>=', $range[0])
                ->where('created_at', '<', $range[1])
                ->count(),
        ])->values()->all();
    }
}
