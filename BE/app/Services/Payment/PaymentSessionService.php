<?php

namespace App\Services\Payment;

use App\Mail\PaymentConfirmation;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\User;
use App\Services\CartService;
use App\Services\EnrollmentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PaymentSessionService
{
    public function methods(): array
    {
        $settings = PaymentSetting::current()->configuration;
        $methods = [];
        if ($settings['momo']['enabled']) {
            $methods[] = ['code' => 'momo', 'label' => 'Thanh toán qua ví MoMo', 'mode' => 'mock'];
        }
        if ($settings['bank']['enabled'] && $settings['bank']['is_active']) {
            $methods[] = ['code' => 'bank', 'label' => 'Thanh toán qua ngân hàng', 'mode' => 'mock'];
        }
        $methods[] = ['code' => 'card', 'label' => 'Thanh toán bằng thẻ (mô phỏng)', 'mode' => 'mock'];

        return $methods;
    }

    public function start(User $user, Order $order, string $method): Order
    {
        return DB::transaction(function () use ($user, $order, $method): Order {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_unless($order->user_id === $user->id, 403);
            abort_if($order->status === 'paid', 422, 'Đơn hàng đã được thanh toán.');
            $this->assertPurchasable($order);
            abort_unless(in_array($method, array_column($this->methods(), 'code'), true), 422, 'Phương thức thanh toán hiện không khả dụng.');

            if ($order->payment_status === 'pending' && $order->payment_session !== null) {
                abort_unless($order->payment_method === $method, 422, 'Hãy hủy phiên hiện tại trước khi đổi phương thức.');

                return $order;
            }
            abort_if($order->status === 'pending' && $order->transaction_ref !== null && $order->payment_session === null, 409, 'Đơn hàng đang được xử lý.');
            $settings = PaymentSetting::current()->configuration;
            $token = Str::random(48);
            $reference = 'LMS-'.$order->id;
            $session = [
                'token' => $token,
                'mode' => 'mock',
                'reference' => $reference,
                'merchant_name' => $settings['momo']['merchant_name'],
                'qr_payload' => $method === 'momo' ? 'seongon://sandbox/payment?'.http_build_query(['order' => $order->id, 'amount' => $order->amount, 'session' => $token]) : ($method === 'bank' ? ($settings['bank']['qr_payload'] ?: null) : null),
                'bank' => $method === 'bank' ? $settings['bank'] : null,
            ];
            $order->update([
                'status' => 'pending', 'failure_reason' => null, 'payment_method' => $method,
                'transaction_ref' => 'PAYMENT-'.$order->id.'-'.Str::upper(Str::random(8)), 'payment_session' => $session,
                'payment_started_at' => now(), 'payment_expires_at' => now()->addMinutes(15),
            ]);

            return $order;
        });
    }

    public function complete(User $user, Order $order, string $token, string $outcome): array
    {
        return DB::transaction(function () use ($user, $order, $token, $outcome): array {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_unless($order->user_id === $user->id, 403);
            abort_unless($order->payment_session && hash_equals($order->payment_session['token'], $token), 403);
            abort_unless(($order->payment_session['mode'] ?? null) === 'mock', 403, 'Phiên thanh toán không hỗ trợ xác nhận trực tiếp.');
            if ($order->status === 'paid') {
                return ['order' => $order, 'enrollment' => $order->enrollment];
            }
            abort_unless($order->payment_status === 'pending', 422, 'Phiên thanh toán đã hủy hoặc hết hạn. Hãy tạo phiên mới.');
            if ($outcome === 'cancel') {
                $order->update(['status' => 'failed', 'failure_reason' => 'Người học đã hủy thanh toán.']);

                return ['order' => $order, 'enrollment' => null];
            }
            $this->assertPurchasable($order);
            $result = app(PaymentGateway::class)->charge($order, ['outcome' => 'success', 'idempotency_key' => 'ORDER-'.$order->id]);
            abort_unless($result->success, 422, 'Thanh toán chưa hoàn tất. Vui lòng thử lại.');
            $order->update(['status' => 'paid', 'failure_reason' => null, 'transaction_ref' => $result->transactionRef, 'paid_at' => now()]);
            $enrollment = app(EnrollmentService::class)->createFromOrder($order);
            app(CartService::class)->removePurchasedItem($order);
            Mail::to($user->email)->queue((new PaymentConfirmation($order->load('course')))->afterCommit());

            return ['order' => $order, 'enrollment' => $enrollment];
        });
    }

    private function assertPurchasable(Order $order): void
    {
        abort_unless($order->course?->status === 'published', 422, 'Khóa học không còn mở đăng ký.');
        abort_if(Enrollment::where('user_id', $order->user_id)->where('course_id', $order->course_id)->where('expires_at', '>', now())->exists(), 422, 'Bạn đã sở hữu khóa học này.');
        $canonical = Order::where('user_id', $order->user_id)->where('course_id', $order->course_id)->whereIn('status', ['pending', 'failed'])->oldest('id')->value('id');
        abort_unless((int) $canonical === $order->id, 422, 'Đơn hàng này đã được thay thế bởi một đơn đang xử lý.');
    }
}
