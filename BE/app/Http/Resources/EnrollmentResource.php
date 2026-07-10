<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnrollmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'enrolled_at' => $this->enrolled_at,
            'expires_at' => $this->expires_at,
            'status' => $this->status,
            'is_expired' => $this->expires_at->isPast(),
            'course' => new CourseResource($this->whenLoaded('course')),
            // progress được controller gán khi cần.
            'progress' => $this->when(isset($this->progress), fn () => $this->progress),
        ];
    }
}
