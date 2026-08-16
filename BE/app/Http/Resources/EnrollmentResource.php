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
            'user_id' => $this->user_id,
            'course_id' => $this->course_id,
            'order_id' => $this->order_id,
            'enrolled_at' => $this->enrolled_at,
            'expires_at' => $this->expires_at,
            'status' => $this->status,
            'is_expired' => $this->expires_at->isPast(),
            'user' => new UserResource($this->whenLoaded('user')),
            'course' => new CourseResource($this->whenLoaded('course')),
            'order' => new OrderResource($this->whenLoaded('order')),
            'certificate' => new CertificateResource($this->whenLoaded('certificate')),
            // progress được controller gán khi cần.
            'progress' => $this->when(isset($this->progress), fn () => $this->progress),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
