<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCartResource;
use App\Services\CartService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CartController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', Rule::in(['empty', 'non_empty'])],
        ]);

        return AdminCartResource::collection($this->carts->paginateForAdmin($filters));
    }
}
