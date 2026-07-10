<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnrollmentResource;
use App\Http\Resources\OrderResource;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Services\EnrollmentService;
use App\Services\Payment\PaymentGateway;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
        ]);

        $user = $request->user();
        $course = Course::published()->findOrFail($data['course_id']);

        $existing = Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        if ($existing && $existing->expires_at->isFuture()) {
            return response()->json(['message' => 'Bạn đã sở hữu khóa học này.'], 422);
        }

        $order = Order::create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'amount' => $course->price,
            'status' => 'pending',
        ]);

        return (new OrderResource($order->load('course')))
            ->response()
            ->setStatusCode(201);
    }

    public function pay(
        Request $request,
        Order $order,
        PaymentGateway $gateway,
        EnrollmentService $enrollments,
    ) {
        abort_if($order->user_id !== $request->user()->id, 403);

        if ($order->status === 'paid') {
            return response()->json(['message' => 'Đơn hàng đã được thanh toán.'], 422);
        }

        $data = $request->validate([
            'payment_method' => ['required', 'in:card,qr'],
            'outcome' => ['nullable', 'in:success,failure'],
        ]);

        $result = $gateway->charge($order, $data);

        if (! $result->success) {
            $order->update([
                'status' => 'failed',
                'payment_method' => $data['payment_method'],
            ]);

            return response()->json([
                'message' => $result->message ?? 'Thanh toán thất bại.',
                'order' => new OrderResource($order),
            ], 422);
        }

        $order->update([
            'status' => 'paid',
            'payment_method' => $data['payment_method'],
            'transaction_ref' => $result->transactionRef,
            'paid_at' => now(),
        ]);

        $enrollment = $enrollments->createFromOrder($order);

        return response()->json([
            'message' => $result->message ?? 'Thanh toán thành công.',
            'order' => new OrderResource($order->fresh()),
            'enrollment' => new EnrollmentResource($enrollment->load('course')),
        ]);
    }
}
