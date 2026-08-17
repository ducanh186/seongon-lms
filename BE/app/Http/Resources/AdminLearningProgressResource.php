<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminLearningProgressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'enrollment_id' => $this->enrollment_id,
            'lesson_id' => $this->lesson_id,
            'is_completed' => $this->is_completed,
            'completed_at' => $this->completed_at,
            'user' => $this->whenLoaded('enrollment', fn () => new UserResource($this->enrollment->user)),
            'course' => $this->whenLoaded('enrollment', fn () => new CourseResource($this->enrollment->course)),
            'lesson' => $this->whenLoaded('lesson', fn () => [
                'id' => $this->lesson->id,
                'course_id' => $this->lesson->course_id,
                'title' => $this->lesson->title,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
