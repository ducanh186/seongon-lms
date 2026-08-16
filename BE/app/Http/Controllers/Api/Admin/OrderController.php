<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request)
    {
        return OrderResource::collection(
            $this->orders->paginateForAdmin($request->only(['status', 'course_id', 'user_id'])),
        );
    }

    public function show(Order $order)
    {
        return new OrderResource($this->orders->forAdmin($order));
    }
}
