<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnrollmentResource;
use App\Http\Resources\OrderResource;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use App\Services\CartService;
use App\Services\EnrollmentService;
use App\Services\Payment\PaymentGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function store(Request $request, CartService $carts)
    {
        $data = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
        ]);

        $order = $carts->createPendingOrder($request->user(), (int) $data['course_id']);

        return (new OrderResource($order->load('course')))
            ->response()
            ->setStatusCode(201);
    }

    public function pay(
        Request $request,
        Order $order,
        PaymentGateway $gateway,
        EnrollmentService $enrollments,
        CartService $carts,
    ) {
        abort_if($order->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'payment_method' => ['required', 'in:card,qr'],
            'outcome' => ['nullable', 'in:success,failure'],
        ]);

        $preparedOrder = DB::transaction(function () use ($data, $order, $request): Order {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_if($lockedOrder->user_id !== $request->user()->id, 403);
            abort_if($lockedOrder->status === 'paid', 422, 'Đơn hàng đã được thanh toán.');

            $completedPurchaseExists = Enrollment::query()
                ->where('user_id', $lockedOrder->user_id)
                ->where('course_id', $lockedOrder->course_id)
                ->where('expires_at', '>', now())
                ->exists();
            abort_if($completedPurchaseExists, 422, 'Bạn đã sở hữu khóa học này.');

            $canonicalOrderId = Order::query()
                ->where('user_id', $lockedOrder->user_id)
                ->where('course_id', $lockedOrder->course_id)
                ->whereIn('status', ['pending', 'failed'])
                ->oldest('id')
                ->lockForUpdate()
                ->value('id');

            abort_if((int) $canonicalOrderId !== $lockedOrder->id, 422, 'Đơn hàng này đã được thay thế bởi một đơn đang xử lý.');

            if ($lockedOrder->transaction_ref === null) {
                $lockedOrder->transaction_ref = "ORDER-{$lockedOrder->id}";
            }
            $lockedOrder->payment_method = $data['payment_method'];
            $lockedOrder->save();

            return $lockedOrder;
        });

        $attemptKey = (string) $preparedOrder->transaction_ref;
        $attemptAmount = (string) $preparedOrder->amount;
        $result = $gateway->charge($preparedOrder, [
            ...$data,
            'idempotency_key' => $attemptKey,
        ]);

        if (! $result->success) {
            $failedOrder = DB::transaction(function () use ($attemptAmount, $attemptKey, $order, $request): Order {
                User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

                if ($lockedOrder->status !== 'paid') {
                    $this->assertPaymentAttemptUnchanged($lockedOrder, $attemptKey, $attemptAmount);
                    $lockedOrder->update(['status' => 'failed']);
                }

                return $lockedOrder;
            });

            return response()->json([
                'message' => $result->message ?? 'Thanh toán thất bại.',
                'order' => new OrderResource($failedOrder),
            ], 422);
        }

        $payment = DB::transaction(function () use ($attemptAmount, $attemptKey, $carts, $data, $enrollments, $order, $request, $result): array {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $lockedOrder = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status === 'paid') {
                return [
                    'order' => $lockedOrder,
                    'enrollment' => $lockedOrder->enrollment()->firstOrFail(),
                ];
            }

            $this->assertPaymentAttemptUnchanged($lockedOrder, $attemptKey, $attemptAmount);

            $existingEnrollment = Enrollment::query()
                ->where('user_id', $lockedOrder->user_id)
                ->where('course_id', $lockedOrder->course_id)
                ->where('expires_at', '>', now())
                ->exists();
            abort_if($existingEnrollment, 422, 'Bạn đã sở hữu khóa học này.');

            $lockedOrder->update([
                'status' => 'paid',
                'payment_method' => $data['payment_method'],
                'transaction_ref' => $result->transactionRef,
                'paid_at' => now(),
            ]);

            $enrollment = $enrollments->createFromOrder($lockedOrder);
            $carts->removePurchasedItem($lockedOrder);

            return [
                'order' => $lockedOrder,
                'enrollment' => $enrollment,
            ];
        });

        return response()->json([
            'message' => $result->message ?? 'Thanh toán thành công.',
            'order' => new OrderResource($payment['order']->fresh()),
            'enrollment' => new EnrollmentResource($payment['enrollment']->load('course')),
        ]);
    }

    private function assertPaymentAttemptUnchanged(Order $order, string $key, string $amount): void
    {
        abort_unless(
            $order->transaction_ref === $key && (string) $order->amount === $amount,
            409,
            'Trạng thái thanh toán đã thay đổi. Vui lòng tải lại đơn hàng.',
        );
    }
}
