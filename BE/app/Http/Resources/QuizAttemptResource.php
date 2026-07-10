<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Kết quả bài thi — có hiển thị đúng/sai để học viên xem lại.
 */
class QuizAttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quiz_id' => $this->quiz_id,
            'score' => $this->score,
            'passed' => $this->passed,
            'attempt_no' => $this->attempt_no,
            'submitted_at' => $this->submitted_at,
            'answers' => $this->whenLoaded('answers', fn () => $this->answers->map(fn ($a) => [
                'question_id' => $a->question_id,
                'selected_option_id' => $a->selected_option_id,
                'is_correct' => $a->is_correct,
            ])->values()),
        ];
    }
}
