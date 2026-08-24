<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'order_id' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', Rule::in(['pending', 'paid', 'failed'])],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'course_title' => ['nullable', 'string', 'max:255'],
            'student' => ['nullable', 'string', 'max:255'],
            'created_on' => ['nullable', 'date_format:Y-m-d'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        return OrderResource::collection(
            $this->orders->paginateForAdmin($filters),
        );
    }

    public function show(Order $order)
    {
        return new OrderResource($this->orders->forAdmin($order));
    }
}
