<?php

namespace App\Services;

use App\Models\Attempt;
use App\Models\Enrollment;
use App\Models\Exam;
use Illuminate\Support\Facades\DB;

class ExamGradingService
{
    public function __construct(private CertificateService $certificates) {}

    public function attemptsUsed(Enrollment $enrollment, Exam $exam): int
    {
        return Attempt::where('enrollment_id', $enrollment->id)
            ->where('exam_id', $exam->id)
            ->count();
    }

    /**
     * Chấm bài thi, lưu attempt + đáp án đã chọn, cấp chứng chỉ nếu đạt.
     *
     * Đáp án lưu thẳng vào cột JSON attempts.answers — không còn bảng phụ.
     *
     * @param  array<int, array{question_id:int, option_id:int|null}>  $answers
     */
    public function grade(Enrollment $enrollment, Exam $exam, array $answers): Attempt
    {
        $attemptNumber = (int) Attempt::where('enrollment_id', $enrollment->id)
            ->where('exam_id', $exam->id)
            ->max('attempt_number') + 1;
        $attempt = Attempt::create([
            'enrollment_id' => $enrollment->id,
            'exam_id' => $exam->id,
            'attempt_number' => $attemptNumber,
            'status' => 'in_progress',
            'started_at' => now(),
            'expires_at' => now(),
            'answers' => collect($answers)->map(fn (array $answer) => [
                'question_id' => (int) $answer['question_id'],
                'selected_answer_id' => $answer['option_id'] === null ? null : (int) $answer['option_id'],
            ])->values()->all(),
        ]);

        return $this->finalizeAttempt($attempt, 'submitted');
    }

    public function finalizeAttempt(Attempt $attempt, string $status = 'submitted'): Attempt
    {
        $attempt->loadMissing('enrollment', 'exam.questions.answers');
        $enrollment = $attempt->enrollment;
        $exam = $attempt->exam;
        $answers = collect($attempt->answers ?? [])->map(fn (array $answer) => [
            'question_id' => (int) $answer['question_id'],
            'option_id' => $answer['selected_answer_id'] ?? null,
        ])->all();
        $exam->loadMissing('questions.answers');
        $questions = $attempt->question_ids === null
            ? $exam->questions
            : $exam->questions->whereIn('id', $attempt->question_ids);
        $total = $questions->count();

        $selected = collect($answers)->keyBy('question_id');

        $correctCount = 0;
        $answerRows = [];

        foreach ($questions as $question) {
            $chosen = $selected[$question->id]['option_id'] ?? null;
            $correctAnswer = $question->answers->firstWhere('is_correct', true);
            $isCorrect = $chosen !== null
                && $correctAnswer !== null
                && (int) $chosen === (int) $correctAnswer->id;

            if ($isCorrect) {
                $correctCount++;
            }

            $answerRows[] = [
                'question_id' => $question->id,
                'selected_answer_id' => $chosen === null ? null : (int) $chosen,
                'is_correct' => $isCorrect,
            ];
        }

        $score = $total > 0 ? (int) round($correctCount / $total * 100) : 0;
        $passed = $score >= $exam->pass_score;

        return DB::transaction(function () use (
            $attempt, $enrollment, $score, $passed, $status, $answerRows, $correctCount, $total
        ) {
            $finishedAt = $status === 'expired' && $attempt->expires_at
                ? $attempt->expires_at
                : now();
            $attempt->update([
                'score' => $score,
                'passed' => $passed,
                'correct_count' => $correctCount,
                'wrong_count' => $total - $correctCount,
                'answers' => $answerRows,
                'status' => $status,
                'finished_at' => $finishedAt,
                'submitted_at' => $finishedAt,
            ]);

            if ($passed) {
                $this->certificates->issueForEnrollment($enrollment);
            }

            return $attempt->refresh();
        });
    }
}
