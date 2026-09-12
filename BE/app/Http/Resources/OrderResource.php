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
            'total_amount' => $this->total_amount ?? $this->amount,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'failure_reason' => $this->status === 'paid' ? null : ($this->payment_status === 'expired'
                ? 'Phiên thanh toán đã hết hạn.'
                : ($this->status === 'failed' ? ($this->failure_reason ?? 'Không ghi nhận lý do thanh toán thất bại.') : null)),
            'payment_session' => $this->when($request->user()?->id === $this->user_id, $this->payment_session),
            'payment_started_at' => $this->payment_started_at,
            'payment_expires_at' => $this->payment_expires_at,
            'mock_callback_allowed' => $request->user()?->id === $this->user_id
                && data_get($this->payment_session, 'mode') === 'mock',
            'payment_method' => $this->payment_method,
            'transaction_ref' => $this->transaction_ref,
            'paid_at' => $this->paid_at,
            'user' => new UserResource($this->whenLoaded('user')),
            'course' => new CourseResource($this->whenLoaded('course')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
