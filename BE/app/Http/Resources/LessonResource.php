<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LessonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'title' => $this->title,
            'video_url' => $this->video_url,
            'description' => $this->description,
            'duration' => $this->duration,
            'position' => $this->position,
            // is_completed chỉ có mặt khi controller gán (ngữ cảnh học viên).
            'is_completed' => $this->when(isset($this->is_completed), fn () => (bool) $this->is_completed),
        ];
    }
}
