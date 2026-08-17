<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminQuestionIndexResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam_id' => $this->exam_id,
            'content' => $this->content,
            'sort_order' => $this->sort_order,
            'answers_count' => $this->whenCounted('answers'),
            'exam' => $this->whenLoaded('exam', fn () => [
                'id' => $this->exam->id,
                'title' => $this->exam->title,
            ]),
            'course' => $this->whenLoaded('exam', fn () => [
                'id' => $this->exam->course->id,
                'title' => $this->exam->course->title,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
