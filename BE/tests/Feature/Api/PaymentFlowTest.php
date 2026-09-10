<?php

namespace Tests\Feature\Api;

use App\Mail\PaymentConfirmation;
use App\Models\Course;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    private function checkout(): Order
    {
        Sanctum::actingAs(User::factory()->create());
        $course = Course::factory()->create(['status' => 'published', 'price' => 49000]);
        $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();
        $response = $this->postJson('/api/v1/orders', ['course_id' => $course->id])->assertCreated();

        return Order::findOrFail($response->json('data.id'));
    }

    public function test_settings_are_admin_only_and_disabled_providers_cannot_start(): void
    {
        $order = $this->checkout();
        $this->getJson('/api/v1/admin/payment-settings')->assertForbidden();
        $this->postJson("/api/v1/orders/{$order->id}/payment-session", ['payment_method' => 'bank'])->assertUnprocessable();
        Sanctum::actingAs(User::factory()->admin()->create());
        $settings = $this->getJson('/api/v1/admin/payment-settings')->assertOk()->json('data');
        $settings['momo']['enabled'] = false;
        $this->putJson('/api/v1/admin/payment-settings', $settings)->assertOk();
        Sanctum::actingAs($order->user);
        $this->getJson('/api/v1/payment-methods')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson("/api/v1/orders/{$order->id}/payment-session", ['payment_method' => 'momo'])->assertUnprocessable();
    }

    public function test_momo_session_starts_pending_then_callback_grants_access_and_queues_one_email(): void
    {
        Mail::fake();
        $order = $this->checkout();
        $this->getJson("/api/v1/orders/{$order->id}")->assertOk()->assertJsonPath('data.payment_status', 'draft');
        $session = $this->postJson("/api/v1/orders/{$order->id}/payment-session", ['payment_method' => 'momo', 'amount' => 1])
            ->assertOk()->assertJsonPath('data.payment_status', 'pending')->assertJsonPath('data.amount', '49000.00')
            ->assertJsonPath('data.payment_method', 'momo')->json('data.payment_session');
        $this->assertNotEmpty($session['qr_payload']);
        $this->assertDatabaseCount('enrollments', 0);
        $payload = ['session_token' => $session['token'], 'outcome' => 'success'];
        $this->postJson("/api/v1/orders/{$order->id}/mock-callback", $payload)->assertOk()->assertJsonPath('order.payment_status', 'paid');
        $this->postJson("/api/v1/orders/{$order->id}/mock-callback", $payload)->assertOk();
        $this->assertDatabaseCount('enrollments', 1);
        $this->assertDatabaseCount('cart_items', 0);
        $this->getJson('/api/v1/my/transactions')->assertOk()->assertJsonPath('data.0.id', $order->id)->assertJsonPath('data.0.payment_method', 'momo');
        Mail::assertQueued(PaymentConfirmation::class, 1);
    }

    public function test_bank_session_snapshots_admin_settings_and_rejects_invalid_callbacks(): void
    {
        $order = $this->checkout();
        Sanctum::actingAs(User::factory()->admin()->create());
        $settings = $this->getJson('/api/v1/admin/payment-settings')->assertOk()->json('data');
        $settings['bank'] = ['enabled' => true, 'bank_name' => 'Test Bank', 'account_name' => 'Test Receiver', 'account_number' => '123456789', 'branch' => 'Test Branch', 'qr_payload' => 'TEST-BANK-PAYLOAD', 'instructions' => 'Use the order reference.', 'is_active' => true];
        $this->putJson('/api/v1/admin/payment-settings', $settings)->assertOk();
        Sanctum::actingAs($order->user);
        $session = $this->postJson("/api/v1/orders/{$order->id}/payment-session", ['payment_method' => 'bank'])
            ->assertOk()->assertJsonPath('data.payment_session.bank.account_number', '123456789')->json('data.payment_session');
        $this->postJson("/api/v1/orders/{$order->id}/mock-callback", ['session_token' => 'wrong', 'outcome' => 'success'])->assertForbidden();
        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/v1/orders/{$order->id}")->assertForbidden();
        $this->postJson("/api/v1/orders/{$order->id}/mock-callback", ['session_token' => $session['token'], 'outcome' => 'success'])->assertForbidden();
        Sanctum::actingAs($order->user);
        $this->travel(16)->minutes();
        $this->getJson("/api/v1/orders/{$order->id}")->assertOk()->assertJsonPath('data.payment_status', 'expired');
        $this->postJson("/api/v1/orders/{$order->id}/mock-callback", ['session_token' => $session['token'], 'outcome' => 'success'])->assertUnprocessable();
        $this->assertDatabaseCount('enrollments', 0);
    }

    public function test_admin_payment_status_filters_separate_drafts_from_started_sessions(): void
    {
        $order = $this->checkout();
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/orders?payment_status=pending')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/admin/orders?payment_status=draft')->assertOk()->assertJsonPath('data.0.id', $order->id);
        Sanctum::actingAs($order->user);
        $session = $this->postJson("/api/v1/orders/{$order->id}/payment-session", ['payment_method' => 'momo'])->assertOk()->json('data.payment_session');
        $this->postJson("/api/v1/orders/{$order->id}/pay", ['payment_method' => 'qr'])->assertUnprocessable();
        $this->postJson("/api/v1/orders/{$order->id}/mock-callback", ['session_token' => $session['token'], 'outcome' => 'cancel'])->assertOk()->assertJsonPath('order.payment_status', 'cancelled');
        $next = $this->postJson("/api/v1/orders/{$order->id}/payment-session", ['payment_method' => 'momo'])->assertOk()->json('data.payment_session');
        $this->assertNotSame($session['token'], $next['token']);
        $this->postJson("/api/v1/orders/{$order->id}/mock-callback", ['session_token' => $session['token'], 'outcome' => 'success'])->assertForbidden();
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/orders?payment_status=draft')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/admin/orders?payment_status=pending')->assertOk()->assertJsonPath('data.0.id', $order->id);
    }

    public function test_mock_confirmation_follows_the_started_session_mode_in_production(): void
    {
        $order = $this->checkout();
        $response = $this->postJson("/api/v1/orders/{$order->id}/payment-session", ['payment_method' => 'momo'])->assertOk();
        $session = $response->json('data.payment_session');
        $this->assertStringNotContainsString($session['token'], $response->json('data.transaction_ref'));
        $this->app->instance('env', 'production');
        $this->postJson("/api/v1/orders/{$order->id}/mock-callback", ['session_token' => $session['token'], 'outcome' => 'success'])->assertOk();
        $this->assertDatabaseCount('enrollments', 1);
    }
}
