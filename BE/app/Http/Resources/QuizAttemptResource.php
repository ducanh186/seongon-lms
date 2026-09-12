<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Kết quả bài thi — có hiển thị đúng/sai để học viên xem lại.
 *
 * Đọc từ Attempt (bảng attempts) nhưng GIỮ NGUYÊN tên field cũ (`quiz_id`,
 * `attempt_no`, `selected_option_id`) vì frontend đang dùng. Đổi tên field là
 * breaking change, thuộc P3.
 */
class QuizAttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $correctAnswers = $this->resource->relationLoaded('exam')
            ? $this->exam->questions->mapWithKeys(fn ($question) => [
                $question->id => $question->answers->firstWhere('is_correct', true)?->id,
            ])
            : collect();

        return [
            'id' => $this->id,
            'quiz_id' => $this->exam_id,
            'score' => $this->score,
            'passed' => $this->passed,
            'attempt_no' => $this->attempt_number,
            'correct_count' => $this->correct_count,
            'wrong_count' => $this->wrong_count,
            'status' => $this->status,
            'started_at' => $this->started_at,
            'expires_at' => $this->expires_at,
            'finished_at' => $this->finished_at,
            'submitted_at' => $this->submitted_at,
            'answers' => collect($this->answers ?? [])->map(function (array $answer) use ($correctAnswers) {
                $result = [
                    'question_id' => $answer['question_id'],
                    'selected_option_id' => $answer['selected_answer_id'] ?? null,
                ];
                if (array_key_exists('is_correct', $answer)) {
                    $result['is_correct'] = $answer['is_correct'];
                    $result['correct_answer_id'] = $correctAnswers->get($answer['question_id']);
                }

                return $result;
            })->values(),
        ];
    }
}
