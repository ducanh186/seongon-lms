<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $teacherProfile = $this->relationLoaded('teacherProfile') ? $this->teacherProfile : null;

        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'thumbnail' => $this->thumbnail,
            'price' => $this->price,
            'teacher_profile_id' => $this->teacher_profile_id,
            'instructor_name' => $teacherProfile?->name,
            'instructor_bio' => $teacherProfile?->bio,
            'teacher_profile' => new TeacherProfileResource($this->whenLoaded('teacherProfile')),
            'level' => $this->level,
            'status' => $this->status,
            'anti_cheat_enabled' => (bool) $this->anti_cheat_enabled,
            'lessons_count' => $this->whenCounted('lessons'),
            'questions_count' => $this->whenCounted('questions'),
            'enrollments_count' => $this->whenCounted('enrollments'),
            'reviews_count' => $this->whenCounted('reviews'),
            'exam_exists' => $this->when(isset($this->exam_exists), fn () => (bool) $this->exam_exists),
            'rating' => $this->when(
                $this->reviews_avg_rating !== null,
                fn () => round((float) $this->reviews_avg_rating, 1),
            ),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'lessons' => LessonResource::collection($this->whenLoaded('lessons')),
            'has_quiz' => $this->when($this->relationLoaded('quiz'), fn () => $this->quiz !== null),
            'enrollment' => $this->when($this->relationLoaded('studentEnrollment'), function () {
                $enrollment = $this->getRelation('studentEnrollment');
                if ($enrollment === null) {
                    return null;
                }

                return [
                    'id' => $enrollment->id,
                    'expires_at' => $enrollment->expires_at,
                    'status' => $enrollment->status,
                    'is_expired' => $enrollment->expires_at->isPast(),
                ];
            }),
            'created_at' => $this->created_at,
            'published_at' => $this->status === 'published' ? $this->updated_at : null,
            'updated_at' => $this->updated_at,
        ];
    }
}
