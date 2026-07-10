<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'status' => $this->status,
            'user' => [
                'id' => $this->whenLoaded('user', fn () => $this->user->id),
                'name' => $this->whenLoaded('user', fn () => $this->user->name),
            ],
            'created_at' => $this->created_at,
        ];
    }
}
