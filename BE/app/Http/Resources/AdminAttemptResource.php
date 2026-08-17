<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminAttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'enrollment_id' => $this->enrollment_id,
            'exam_id' => $this->exam_id,
            'score' => $this->score,
            'passed' => $this->passed,
            'attempt_number' => $this->attempt_number,
            'correct_count' => $this->correct_count,
            'wrong_count' => $this->wrong_count,
            'submitted_at' => $this->submitted_at,
            'user' => $this->whenLoaded('enrollment', fn () => new UserResource($this->enrollment->user)),
            'course' => $this->whenLoaded('enrollment', fn () => new CourseResource($this->enrollment->course)),
            'exam' => $this->whenLoaded('exam', fn () => [
                'id' => $this->exam->id,
                'course_id' => $this->exam->course_id,
                'title' => $this->exam->title,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
