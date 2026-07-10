<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Services\ProgressService;
use App\Support\InteractsWithEnrollment;
use Illuminate\Http\Request;

class LessonController extends Controller
{
    use InteractsWithEnrollment;

    public function complete(Request $request, Lesson $lesson, ProgressService $progress)
    {
        $lesson->loadMissing('course');
        $enrollment = $this->resolveActiveEnrollment($request->user(), $lesson->course);

        $progress->completeLesson($enrollment, $lesson);

        return response()->json($progress->summary($enrollment));
    }
}
