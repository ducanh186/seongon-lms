<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnrollmentResource;
use App\Http\Resources\LessonResource;
use App\Models\Course;
use App\Models\Enrollment;
use App\Services\ProgressService;
use App\Support\InteractsWithEnrollment;
use Illuminate\Http\Request;

class MyCourseController extends Controller
{
    use InteractsWithEnrollment;

    public function index(Request $request, ProgressService $progress)
    {
        $userId = $request->user()->id;
        $summaryEnrollments = Enrollment::where('user_id', $userId)
            ->withCount([
                'lessonProgress as completed_lessons_count' => fn ($query) => $query->where('is_completed', true),
            ])
            ->get(['id', 'course_id']);
        $lessonCounts = Course::whereIn('id', $summaryEnrollments->pluck('course_id')->unique())
            ->withCount('lessons')
            ->pluck('lessons_count', 'id');
        $completedCount = $summaryEnrollments->filter(function (Enrollment $enrollment) use ($lessonCounts) {
            $totalLessons = $lessonCounts->get($enrollment->course_id, 0);

            return $totalLessons > 0 && $enrollment->completed_lessons_count >= $totalLessons;
        })->count();

        $enrollments = Enrollment::where('user_id', $userId)
            ->with(['course.category', 'certificate'])
            ->latest()
            ->paginate(12);

        $enrollments->getCollection()->transform(function (Enrollment $enrollment) use ($progress) {
            $enrollment->progress = $progress->summary($enrollment);

            return $enrollment;
        });

        return EnrollmentResource::collection($enrollments)->additional([
            'summary' => [
                'total' => $summaryEnrollments->count(),
                'active' => $summaryEnrollments->count() - $completedCount,
                'completed' => $completedCount,
            ],
        ]);
    }

    public function lessons(Request $request, Course $course)
    {
        $enrollment = $this->resolveActiveEnrollment($request->user(), $course);

        $completed = $enrollment->lessonProgress()
            ->where('is_completed', true)
            ->pluck('lesson_id')
            ->flip();

        $lessons = $course->lessons()->get()->map(function ($lesson) use ($completed) {
            $lesson->is_completed = $completed->has($lesson->id);

            return $lesson;
        });

        return LessonResource::collection($lessons);
    }

    public function progress(Request $request, Course $course, ProgressService $progress)
    {
        $enrollment = $this->resolveActiveEnrollment($request->user(), $course);

        return response()->json($progress->summary($enrollment));
    }
}
