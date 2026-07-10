<?php

namespace App\Services\Payment;

use App\Models\Order;
use Illuminate\Support\Str;

/**
 * Cổng thanh toán giả lập (mock).
 *
 * Quyết định success/failure dựa trên input `outcome` (dùng cho dev/demo).
 * Không gọi mạng. VNPay/MoMo là driver tương lai — chỉ cần implements PaymentGateway.
 */
class MockGateway implements PaymentGateway
{
    public function charge(Order $order, array $data): PaymentResult
    {
        $outcome = $data['outcome'] ?? 'success';

        if ($outcome === 'failure') {
            return new PaymentResult(false, null, 'Thanh toán thất bại (mock).');
        }

        return new PaymentResult(
            true,
            'MOCK-'.Str::upper(Str::random(12)),
            'Thanh toán thành công (mock).',
        );
    }
}
