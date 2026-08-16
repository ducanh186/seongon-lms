<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = $this->whenLoaded('items');

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'items' => CartItemResource::collection($items),
            'count' => $items->count(),
            'total_amount' => number_format(
                $items->sum(fn ($item): float => (float) $item->course->price),
                2,
                '.',
                '',
            ),
            'updated_at' => $this->updated_at,
        ];
    }
}
