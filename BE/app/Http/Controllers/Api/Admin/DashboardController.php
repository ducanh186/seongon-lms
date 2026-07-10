<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;

class DashboardController extends Controller
{
    public function stats()
    {
        $enrollments = Enrollment::count();
        $certificates = Certificate::count();

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
        ]);
    }
}
