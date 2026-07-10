<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'course_id' => $this->course_id,
            'amount' => $this->amount,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'transaction_ref' => $this->transaction_ref,
            'paid_at' => $this->paid_at,
            'course' => new CourseResource($this->whenLoaded('course')),
            'created_at' => $this->created_at,
        ];
    }
}
