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
        return [
            'id' => $this->id,
            'quiz_id' => $this->exam_id,
            'score' => $this->score,
            'passed' => $this->passed,
            'attempt_no' => $this->attempt_number,
            'correct_count' => $this->correct_count,
            'wrong_count' => $this->wrong_count,
            'submitted_at' => $this->submitted_at,
            'answers' => collect($this->answers ?? [])->map(fn (array $answer) => [
                'question_id' => $answer['question_id'],
                'selected_option_id' => $answer['selected_answer_id'] ?? null,
                'is_correct' => $answer['is_correct'],
            ])->values(),
        ];
    }
}
