<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Illuminate\Support\Facades\DB;

class QuizGradingService
{
    public function __construct(private CertificateService $certificates) {}

    public function attemptsUsed(Enrollment $enrollment, Quiz $quiz): int
    {
        return QuizAttempt::where('enrollment_id', $enrollment->id)
            ->where('quiz_id', $quiz->id)
            ->count();
    }

    /**
     * Chấm bài thi, lưu attempt + answers, cấp chứng chỉ nếu đạt.
     *
     * @param  array<int, array{question_id:int, option_id:int|null}>  $answers
     */
    public function grade(Enrollment $enrollment, Quiz $quiz, array $answers): QuizAttempt
    {
        $quiz->loadMissing('questions.options');
        $questions = $quiz->questions;
        $total = $questions->count();

        $selected = collect($answers)->keyBy('question_id');

        $correctCount = 0;
        $answerRows = [];

        foreach ($questions as $question) {
            $chosen = $selected[$question->id]['option_id'] ?? null;
            $correctOption = $question->options->firstWhere('is_correct', true);
            $isCorrect = $chosen !== null
                && $correctOption !== null
                && (int) $chosen === (int) $correctOption->id;

            if ($isCorrect) {
                $correctCount++;
            }

            $answerRows[] = [
                'question_id' => $question->id,
                'selected_option_id' => $chosen,
                'is_correct' => $isCorrect,
            ];
        }

        $score = $total > 0 ? (int) round($correctCount / $total * 100) : 0;
        $passed = $score >= $quiz->pass_score;
        $attemptNo = (int) QuizAttempt::where('enrollment_id', $enrollment->id)
            ->where('quiz_id', $quiz->id)
            ->max('attempt_no') + 1;

        return DB::transaction(function () use ($enrollment, $quiz, $score, $passed, $attemptNo, $answerRows) {
            $attempt = QuizAttempt::create([
                'enrollment_id' => $enrollment->id,
                'quiz_id' => $quiz->id,
                'score' => $score,
                'passed' => $passed,
                'attempt_no' => $attemptNo,
                'submitted_at' => now(),
            ]);

            $attempt->answers()->createMany($answerRows);

            if ($passed) {
                $this->certificates->issueForEnrollment($enrollment);
            }

            return $attempt;
        });
    }
}
