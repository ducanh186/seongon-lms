<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->json('configuration');
            $table->timestamps();
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method', 20)->nullable()->change();
            $table->json('payment_session')->nullable();
            $table->timestamp('payment_started_at')->nullable();
            $table->timestamp('payment_expires_at')->nullable();
        });
    }

    public function down(): void
    {
        DB::table('orders')
            ->whereNotNull('payment_method')
            ->whereNotIn('payment_method', ['card', 'qr'])
            ->update(['payment_method' => 'qr']);

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['payment_session', 'payment_started_at', 'payment_expires_at']);
            $table->enum('payment_method', ['card', 'qr'])->nullable()->change();
        });
        Schema::dropIfExists('payment_settings');
    }
};
