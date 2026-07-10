<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'thumbnail' => $this->thumbnail,
            'price' => $this->price,
            'instructor_name' => $this->instructor_name,
            'instructor_bio' => $this->instructor_bio,
            'level' => $this->level,
            'status' => $this->status,
            'lessons_count' => $this->whenCounted('lessons'),
            'reviews_count' => $this->whenCounted('reviews'),
            'rating' => $this->when(
                $this->reviews_avg_rating !== null,
                fn () => round((float) $this->reviews_avg_rating, 1),
            ),
            'category' => new CategoryResource($this->whenLoaded('category')),
            'lessons' => LessonResource::collection($this->whenLoaded('lessons')),
            'has_quiz' => $this->when($this->relationLoaded('quiz'), fn () => $this->quiz !== null),
            'created_at' => $this->created_at,
        ];
    }
}
