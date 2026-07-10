<?php

namespace App\Services\Payment;

use App\Models\Order;

interface PaymentGateway
{
    /**
     * Xử lý thanh toán cho một đơn hàng.
     *
     * @param  array<string, mixed>  $data  Dữ liệu thanh toán (payment_method, outcome, ...)
     */
    public function charge(Order $order, array $data): PaymentResult;
}
