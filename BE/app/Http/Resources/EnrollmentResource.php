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
            'progress' => $this->when(
                isset($this->progress) || ($this->relationLoaded('course') && $this->hasAttribute('completed_lessons_count')),
                function (): array {
                    if (isset($this->progress)) {
                        return $this->progress;
                    }

                    $completed = (int) $this->completed_lessons_count;
                    $total = (int) ($this->course?->lessons_count ?? 0);

                    return [
                        'completed' => $completed,
                        'total' => $total,
                        'percent' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
                        'can_take_exam' => $total > 0 && $completed >= $total,
                    ];
                },
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
