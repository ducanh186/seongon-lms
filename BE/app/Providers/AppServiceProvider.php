<?php

namespace App\Providers;

use App\Services\Payment\MockGateway;
use App\Services\Payment\PaymentGateway;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Payment seam: driver hiện tại là mock. Đổi sang VNPay sau chỉ cần thay binding này.
        $this->app->bind(PaymentGateway::class, MockGateway::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
