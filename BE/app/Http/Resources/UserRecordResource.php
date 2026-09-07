<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'old_status' => $this->old_status,
            'new_status' => $this->new_status,
            'reason' => $this->reason,
            'created_at' => $this->created_at,
        ];
    }
}
