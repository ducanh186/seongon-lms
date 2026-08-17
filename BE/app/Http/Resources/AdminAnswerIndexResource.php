<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminAnswerIndexResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question_id' => $this->question_id,
            'content' => $this->content,
            'is_correct' => $this->is_correct,
            'question' => $this->whenLoaded('question', fn () => [
                'id' => $this->question->id,
                'content' => $this->question->content,
            ]),
            'exam' => $this->whenLoaded('question', fn () => [
                'id' => $this->question->exam->id,
                'title' => $this->question->exam->title,
            ]),
            'course' => $this->whenLoaded('question', fn () => [
                'id' => $this->question->exam->course->id,
                'title' => $this->question->exam->course->title,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
