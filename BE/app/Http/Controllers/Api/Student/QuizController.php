<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Http\Resources\QuizAttemptResource;
use App\Http\Resources\QuizResource;
use App\Models\Course;
use App\Models\QuizAttempt;
use App\Services\ProgressService;
use App\Services\QuizGradingService;
use App\Support\InteractsWithEnrollment;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    use InteractsWithEnrollment;

    public function show(Request $request, Course $course)
    {
        $this->resolveActiveEnrollment($request->user(), $course);

        $quiz = $course->quiz()->with('questions.options')->firstOrFail();

        return new QuizResource($quiz);
    }

    public function submit(
        Request $request,
        Course $course,
        ProgressService $progress,
        QuizGradingService $grading,
    ) {
        $enrollment = $this->resolveActiveEnrollment($request->user(), $course);
        $quiz = $course->quiz()->firstOrFail();

        $summary = $progress->summary($enrollment);
        abort_unless(
            $summary['can_take_exam'],
            403,
            'Bạn phải hoàn thành 100% bài học trước khi làm bài thi.',
        );

        if ($grading->attemptsUsed($enrollment, $quiz) >= $quiz->max_attempts) {
            return response()->json(['message' => 'Bạn đã hết số lần làm bài.'], 422);
        }

        $data = $request->validate([
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.option_id' => ['nullable', 'integer'],
        ]);

        $attempt = $grading->grade($enrollment, $quiz, $data['answers']);

        return response()->json([
            'attempt' => new QuizAttemptResource($attempt->load('answers')),
            'passed' => $attempt->passed,
            'score' => $attempt->score,
            'certificate' => $attempt->passed
                ? new CertificateResource($enrollment->certificate()->first())
                : null,
        ]);
    }

    public function showAttempt(Request $request, QuizAttempt $attempt)
    {
        $attempt->loadMissing('enrollment');
        abort_if($attempt->enrollment->user_id !== $request->user()->id, 403);

        return new QuizAttemptResource($attempt->load('answers'));
    }
}
