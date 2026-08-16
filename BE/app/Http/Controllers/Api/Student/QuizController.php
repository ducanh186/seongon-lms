<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Http\Resources\QuizAttemptResource;
use App\Http\Resources\QuizResource;
use App\Models\Attempt;
use App\Models\Course;
use App\Services\ExamGradingService;
use App\Services\ProgressService;
use App\Support\InteractsWithEnrollment;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    use InteractsWithEnrollment;

    public function show(Request $request, Course $course)
    {
        $this->resolveActiveEnrollment($request->user(), $course);

        $exam = $course->exam()->with('questions.answers')->firstOrFail();

        return new QuizResource($exam);
    }

    public function submit(
        Request $request,
        Course $course,
        ProgressService $progress,
        ExamGradingService $grading,
    ) {
        $enrollment = $this->resolveActiveEnrollment($request->user(), $course);
        $exam = $course->exam()->firstOrFail();

        $summary = $progress->summary($enrollment);
        abort_unless(
            $summary['can_take_exam'],
            403,
            'Bạn phải hoàn thành 100% bài học trước khi làm bài thi.',
        );

        if ($grading->attemptsUsed($enrollment, $exam) >= $exam->max_attempts) {
            return response()->json(['message' => 'Bạn đã hết số lần làm bài.'], 422);
        }

        $data = $request->validate([
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.option_id' => ['nullable', 'integer'],
        ]);

        $attempt = $grading->grade($enrollment, $exam, $data['answers']);

        return response()->json([
            'attempt' => new QuizAttemptResource($attempt),
            'passed' => $attempt->passed,
            'score' => $attempt->score,
            'certificate' => $attempt->passed
                ? new CertificateResource($enrollment->certificate()->first())
                : null,
        ]);
    }

    public function showAttempt(Request $request, Attempt $attempt)
    {
        $attempt->loadMissing('enrollment');
        abort_if($attempt->enrollment->user_id !== $request->user()->id, 403);

        return new QuizAttemptResource($attempt);
    }
}
