<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Đề thi cho học viên LÀM BÀI — cố tình KHÔNG trả `is_correct` của đáp án.
 */
class QuizResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'title' => $this->title,
            'pass_score' => $this->pass_score,
            'max_attempts' => $this->max_attempts,
            'duration_minutes' => $this->duration_minutes,
            'closes_at' => $this->closes_at,
            'attempts_remaining' => $this->when(
                isset($this->resource->attempts_remaining),
                $this->resource->attempts_remaining,
            ),
            'best_score' => $this->when(
                isset($this->resource->best_score),
                $this->resource->best_score,
            ),
            'ended' => $this->when(
                isset($this->resource->ended),
                $this->resource->ended,
            ),
            'attempts' => QuizAttemptResource::collection($this->whenLoaded('studentAttempts')),
            'questions' => $this->whenLoaded('questions', fn () => $this->questions->map(fn ($q) => [
                'id' => $q->id,
                'content' => $q->content,
                'options' => $q->answers->map(fn ($o) => [
                    'id' => $o->id,
                    'content' => $o->content,
                ])->values(),
            ])->values()),
        ];
    }
}
