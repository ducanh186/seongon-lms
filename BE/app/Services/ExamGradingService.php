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
        $exam->loadMissing('questions.answers');
        $questions = $exam->questions;
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
        $attemptNumber = (int) Attempt::where('enrollment_id', $enrollment->id)
            ->where('exam_id', $exam->id)
            ->max('attempt_number') + 1;

        return DB::transaction(function () use (
            $enrollment, $exam, $score, $passed, $attemptNumber, $answerRows, $correctCount, $total
        ) {
            $attempt = Attempt::create([
                'enrollment_id' => $enrollment->id,
                'exam_id' => $exam->id,
                'score' => $score,
                'passed' => $passed,
                'attempt_number' => $attemptNumber,
                'correct_count' => $correctCount,
                'wrong_count' => $total - $correctCount,
                'answers' => $answerRows,
                'submitted_at' => now(),
            ]);

            if ($passed) {
                $this->certificates->issueForEnrollment($enrollment);
            }

            return $attempt;
        });
    }
}
