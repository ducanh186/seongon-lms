<?php

namespace App\Services;

use App\Models\Attempt;
use App\Models\Enrollment;
use App\Models\Exam;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttemptLifecycleService
{
    public function __construct(private ExamGradingService $grading) {}

    public function startOrResume(Enrollment $enrollment, Exam $exam): Attempt
    {
        return DB::transaction(function () use ($enrollment, $exam) {
            Enrollment::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();
            if ($exam->closes_at?->isPast()) {
                throw ValidationException::withMessages(['quiz' => 'Bài kiểm tra đã kết thúc.']);
            }
            $active = Attempt::query()
                ->where('enrollment_id', $enrollment->id)
                ->where('exam_id', $exam->id)
                ->where('status', 'in_progress')
                ->lockForUpdate()
                ->first();

            if ($active && $active->expires_at?->isFuture()) {
                return $active;
            }
            if ($active) {
                $this->grading->finalizeAttempt($active, 'expired');
            }

            $attemptsUsed = Attempt::query()
                ->where('enrollment_id', $enrollment->id)
                ->where('exam_id', $exam->id)
                ->count();
            if ($attemptsUsed >= $exam->max_attempts) {
                throw ValidationException::withMessages(['attempt' => 'Bạn đã hết số lần làm bài.']);
            }

            $startedAt = now();
            $questionIds = null;
            if ($exam->total_questions) {
                $allIds = $exam->questions()->pluck('id');
                if ($allIds->count() < $exam->total_questions) {
                    throw ValidationException::withMessages([
                        'quiz' => "Ngân hàng câu hỏi chỉ có {$allIds->count()} câu, cần {$exam->total_questions} câu cho mỗi lượt làm bài.",
                    ]);
                }
                $previousIds = Attempt::query()
                    ->where('enrollment_id', $enrollment->id)
                    ->where('exam_id', $exam->id)
                    ->get(['question_ids'])
                    ->flatMap(fn (Attempt $previous) => $previous->question_ids ?? [])
                    ->unique();
                $available = $allIds->diff($previousIds);
                $pool = $available->count() >= $exam->total_questions ? $available : $allIds;
                $questionIds = $pool->shuffle()->take($exam->total_questions)->values()->all();
            }
            $expiresAt = $startedAt->copy()->addMinutes($exam->duration_minutes ?? 30);
            if ($exam->closes_at?->lt($expiresAt)) {
                $expiresAt = $exam->closes_at->copy();
            }

            return Attempt::create([
                'enrollment_id' => $enrollment->id,
                'exam_id' => $exam->id,
                'attempt_number' => $attemptsUsed + 1,
                'status' => 'in_progress',
                'started_at' => $startedAt,
                'expires_at' => $expiresAt,
                'answers' => [],
                'question_ids' => $questionIds,
            ]);
        });
    }

    /** @param array<int, array{question_id:int, option_id:int|null}> $answers */
    public function saveAnswers(Attempt $attempt, array $answers): Attempt
    {
        return DB::transaction(function () use ($attempt, $answers) {
            $locked = Attempt::query()->lockForUpdate()->findOrFail($attempt->id);
            if ($locked->status !== 'in_progress') {
                return $locked;
            }
            if ($locked->expires_at?->isPast()) {
                return $this->grading->finalizeAttempt($locked, 'expired');
            }

            $exam = $locked->exam()->with('questions.answers')->firstOrFail();
            $questions = $exam->questions->keyBy('id');
            $allowedIds = $locked->question_ids;
            $draft = collect($answers)->map(function (array $answer) use ($questions, $allowedIds) {
                $question = $questions->get((int) $answer['question_id']);
                $optionId = $answer['option_id'] ?? null;
                if (! $question || ($allowedIds !== null && ! in_array((int) $answer['question_id'], $allowedIds, true)) || ($optionId !== null && ! $question->answers->contains('id', (int) $optionId))) {
                    throw ValidationException::withMessages(['answers' => 'Đáp án không thuộc bài kiểm tra này.']);
                }

                return [
                    'question_id' => (int) $answer['question_id'],
                    'selected_answer_id' => $optionId === null ? null : (int) $optionId,
                ];
            })->unique('question_id')->values()->all();

            $locked->update(['answers' => $draft]);

            return $locked->refresh();
        });
    }

    public function finalize(Attempt $attempt, string $status = 'submitted'): Attempt
    {
        return DB::transaction(function () use ($attempt, $status) {
            $locked = Attempt::query()->lockForUpdate()->findOrFail($attempt->id);
            if ($locked->status !== 'in_progress') {
                return $locked;
            }
            $finalStatus = $locked->expires_at?->isPast() ? 'expired' : $status;

            return $this->grading->finalizeAttempt($locked, $finalStatus);
        });
    }

    public function finalizeExpired(): int
    {
        $count = 0;
        Attempt::query()
            ->where('status', 'in_progress')
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->chunkById(100, function ($attempts) use (&$count) {
                foreach ($attempts as $attempt) {
                    if ($this->finalize($attempt, 'expired')->status === 'expired') {
                        $count++;
                    }
                }
            });

        return $count;
    }

    public function finalizeExpiredFor(Enrollment $enrollment, Exam $exam): int
    {
        $count = 0;
        Attempt::query()
            ->where('enrollment_id', $enrollment->id)
            ->where('exam_id', $exam->id)
            ->where('status', 'in_progress')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->eachById(function (Attempt $attempt) use (&$count): void {
                if ($this->finalize($attempt, 'expired')->status === 'expired') {
                    $count++;
                }
            });

        return $count;
    }
}
