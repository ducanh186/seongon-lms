<?php

namespace App\Http\Resources;

use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminCartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'items_count' => $this->whenCounted('items'),
            'items' => AdminCartItemResource::collection($this->whenLoaded('items')),
            'current_total' => number_format(
                (float) $this->items->sum(
                    fn (CartItem $item): float => (float) ($item->course?->price ?? 0),
                ),
                2,
                '.',
                '',
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
