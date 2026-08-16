<?php

namespace App\Services\Payment;

use App\Models\Order;

interface PaymentGateway
{
    /**
     * Xử lý thanh toán cho một đơn hàng.
     *
     * @param  array<string, mixed>  $data  Server payment data, including a stable idempotency_key.
     */
    public function charge(Order $order, array $data): PaymentResult;
}
