<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminCertificateStatusResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $latestPassingAttempt = $this->whenLoaded('attempts', fn () => $this->attempts->first());
        $eligible = (int) $this->total_lessons > 0
            && (int) $this->completed_lessons === (int) $this->total_lessons
            && $this->attempts->isNotEmpty();

        $state = $eligible
            ? ($this->certificate ? 'issued' : 'eligible')
            : 'not_eligible';

        return [
            'enrollment_id' => $this->id,
            'user_id' => $this->user_id,
            'course_id' => $this->course_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'course' => new CourseResource($this->whenLoaded('course')),
            'completed_lessons' => (int) $this->completed_lessons,
            'total_lessons' => (int) $this->total_lessons,
            'eligible' => $eligible,
            'latest_passing_attempt' => $latestPassingAttempt
                ? [
                    'id' => $latestPassingAttempt->id,
                    'exam_id' => $latestPassingAttempt->exam_id,
                    'score' => $latestPassingAttempt->score,
                    'submitted_at' => $latestPassingAttempt->submitted_at,
                ]
                : null,
            'certificate' => new CertificateResource($this->whenLoaded('certificate')),
            'state' => $state,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
