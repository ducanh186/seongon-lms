<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Http\Resources\QuizAttemptResource;
use App\Http\Resources\QuizResource;
use App\Models\Attempt;
use App\Models\Course;
use App\Services\AttemptLifecycleService;
use App\Services\ExamGradingService;
use App\Services\ProgressService;
use App\Support\InteractsWithEnrollment;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    use InteractsWithEnrollment;

    public function show(Request $request, Course $course, ProgressService $progress, AttemptLifecycleService $attemptLifecycle)
    {
        $enrollment = $this->resolveActiveEnrollment($request->user(), $course);
        $summary = $progress->summary($enrollment);
        abort_unless(
            $summary['can_take_exam'],
            403,
            'Bạn phải hoàn thành 100% bài học trước khi làm bài thi.',
        );

        $exam = $course->exam()->with('questions.answers')->firstOrFail();
        $attemptLifecycle->finalizeExpiredFor($enrollment, $exam);
        $attempts = Attempt::query()
            ->with('exam.questions.answers')
            ->where('enrollment_id', $enrollment->id)
            ->where('exam_id', $exam->id)
            ->orderBy('attempt_number')
            ->get();
        $completedAttempts = $attempts->where('status', '!=', 'in_progress')->values();
        $attemptsRemaining = max(0, $exam->max_attempts - $completedAttempts->count());

        $exam->setRelation('studentAttempts', $completedAttempts);
        $exam->setAttribute('attempts_remaining', $attemptsRemaining);
        $exam->setAttribute('best_score', $completedAttempts->max('score'));
        $exam->setAttribute('ended', $attemptsRemaining === 0 || $exam->closes_at?->isPast() === true);

        return new QuizResource($exam);
    }

    public function submit(
        Request $request,
        Course $course,
        ProgressService $progress,
        ExamGradingService $grading,
        AttemptLifecycleService $attempts,
    ) {
        $enrollment = $this->resolveActiveEnrollment($request->user(), $course);
        $exam = $course->exam()->firstOrFail();

        $summary = $progress->summary($enrollment);
        abort_unless(
            $summary['can_take_exam'],
            403,
            'Bạn phải hoàn thành 100% bài học trước khi làm bài thi.',
        );

        $data = $request->validate([
            'answers' => ['required', 'array', 'min:1'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.option_id' => ['nullable', 'integer'],
        ]);

        $attempt = $attempts->startOrResume($enrollment, $exam);
        $attempt = $attempts->saveAnswers($attempt, $data['answers']);
        $attempt = $attempts->finalize($attempt);

        return response()->json([
            'attempt' => new QuizAttemptResource($attempt),
            'passed' => $attempt->passed,
            'score' => $attempt->score,
            'certificate' => $attempt->passed
                ? new CertificateResource($enrollment->certificate()->first())
                : null,
        ]);
    }

    public function start(
        Request $request,
        Course $course,
        ProgressService $progress,
        AttemptLifecycleService $attempts,
    ) {
        $enrollment = $this->resolveActiveEnrollment($request->user(), $course);
        abort_unless(
            $progress->summary($enrollment)['can_take_exam'],
            403,
            'Bạn phải hoàn thành 100% bài học trước khi làm bài thi.',
        );
        $exam = $course->exam()->firstOrFail();
        $attempt = $attempts->startOrResume($enrollment, $exam);

        return $this->lifecycleResponse($attempt);
    }

    public function saveAnswers(Request $request, Attempt $attempt, AttemptLifecycleService $attempts)
    {
        $this->assertAttemptOwner($request, $attempt);
        $data = $request->validate([
            'answers' => ['present', 'array'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.option_id' => ['nullable', 'integer'],
        ]);
        $attempt = $attempts->saveAnswers($attempt, $data['answers']);
        if ($attempt->status !== 'in_progress') {
            return response()->json([
                'message' => 'Thời gian làm bài đã hết. Bài đã được tự động nộp.',
                'attempt' => new QuizAttemptResource($attempt),
                'server_now' => now(),
            ], 409);
        }

        return $this->lifecycleResponse($attempt);
    }

    public function finalize(Request $request, Attempt $attempt, AttemptLifecycleService $attempts)
    {
        $this->assertAttemptOwner($request, $attempt);
        $attempt = $attempts->finalize($attempt);

        return response()->json([
            'attempt' => new QuizAttemptResource($attempt),
            'passed' => $attempt->passed,
            'score' => $attempt->score,
            'certificate' => $attempt->passed
                ? new CertificateResource($attempt->enrollment->certificate()->first())
                : null,
            'server_now' => now(),
        ]);
    }

    public function showAttempt(Request $request, Attempt $attempt)
    {
        $attempt->loadMissing('enrollment', 'exam.questions.answers');
        abort_if($attempt->enrollment->user_id !== $request->user()->id, 403);

        return new QuizAttemptResource($attempt);
    }

    private function assertAttemptOwner(Request $request, Attempt $attempt): void
    {
        $attempt->loadMissing('enrollment');
        abort_if($attempt->enrollment->user_id !== $request->user()->id, 403);
    }

    private function lifecycleResponse(Attempt $attempt)
    {
        return response()->json([
            'attempt' => new QuizAttemptResource($attempt),
            'server_now' => now(),
        ]);
    }
}
