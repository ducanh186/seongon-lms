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

    public function progress(Request $request, Lesson $lesson, ProgressService $progress)
    {
        $validated = $request->validate([
            'position_seconds' => ['required', 'integer', 'min:0'],
            'duration_seconds' => ['required', 'integer', 'min:1'],
        ]);
        $lesson->loadMissing('course');
        $enrollment = $this->resolveActiveEnrollment($request->user(), $lesson->course);
        $playback = $progress->recordPlayback(
            $enrollment,
            $lesson,
            $validated['position_seconds'],
            $validated['duration_seconds'],
        );
        $duration = (int) $playback->video_duration_seconds;
        $watchedPercent = $duration > 0
            ? (int) floor((int) $playback->furthest_position_seconds / $duration * 100)
            : 0;

        return response()->json([
            'lesson' => [
                'lesson_id' => $lesson->id,
                'resume_position_seconds' => (int) $playback->resume_position_seconds,
                'furthest_position_seconds' => (int) $playback->furthest_position_seconds,
                'video_duration_seconds' => $duration,
                'watched_percent' => min(100, $watchedPercent),
                'is_completed' => (bool) $playback->is_completed,
            ],
            'course_progress' => $progress->summary($enrollment),
        ]);
    }
}
