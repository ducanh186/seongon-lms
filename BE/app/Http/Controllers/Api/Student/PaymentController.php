<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnrollmentResource;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\Payment\PaymentSessionService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function methods(PaymentSessionService $payments)
    {
        return response()->json(['data' => $payments->methods()]);
    }

    public function show(Request $request, Order $order)
    {
        abort_unless($order->user_id === $request->user()->id, 403);

        return new OrderResource($order->load('course'));
    }

    public function history(Request $request)
    {
        return OrderResource::collection($request->user()->orders()->with('course')->where('status', 'paid')->latest('paid_at')->paginate(15));
    }

    public function start(Request $request, Order $order, PaymentSessionService $payments)
    {
        abort_unless($order->user_id === $request->user()->id, 403);
        $data = $request->validate(['payment_method' => ['required', 'in:momo,bank,card']]);

        return new OrderResource($payments->start($request->user(), $order, $data['payment_method'])->load('course'));
    }

    public function callback(Request $request, Order $order, PaymentSessionService $payments)
    {
        abort_unless($order->user_id === $request->user()->id, 403);
        $data = $request->validate(['session_token' => ['required', 'string', 'max:100'], 'outcome' => ['required', 'in:success,cancel']]);
        $result = $payments->complete($request->user(), $order, $data['session_token'], $data['outcome']);

        return response()->json([
            'order' => new OrderResource($result['order']->load('course')),
            'enrollment' => $result['enrollment'] ? new EnrollmentResource($result['enrollment']->load('course')) : null,
        ]);
    }
}
