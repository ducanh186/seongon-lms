<?php

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use App\Services\CartService;
use App\Services\EnrollmentService;
use App\Services\Payment\PaymentGateway;
use App\Services\Payment\PaymentResult;
use Laravel\Sanctum\Sanctum;

it('creates a pending order, pays successfully and enrolls for 1 year', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published', 'price' => 299000]);
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();

    $orderId = $this->postJson('/api/v1/orders', ['course_id' => $course->id])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->json('data.id');

    $this->postJson("/api/v1/orders/{$orderId}/pay", [
        'payment_method' => 'card',
        'outcome' => 'success',
    ])->assertOk();

    $enrollment = Enrollment::where('user_id', $user->id)->where('course_id', $course->id)->first();

    expect($enrollment)->not->toBeNull();
    expect(Order::find($orderId)->status)->toBe('paid');
    expect($enrollment->expires_at->toDateString())
        ->toBe(now()->addYear()->toDateString());
});

it('marks the order failed on payment failure and creates no enrollment', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published']);
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();

    $orderId = $this->postJson('/api/v1/orders', ['course_id' => $course->id])->json('data.id');

    $this->postJson("/api/v1/orders/{$orderId}/pay", [
        'payment_method' => 'qr',
        'outcome' => 'failure',
    ])->assertStatus(422);

    expect(Order::find($orderId)->status)->toBe('failed');
    expect(Enrollment::where('user_id', $user->id)->count())->toBe(0);
});

it('does not persist a paid order when enrollment creation fails', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published']);
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();

    $orderId = $this->postJson('/api/v1/orders', ['course_id' => $course->id])->json('data.id');

    $this->app->instance(EnrollmentService::class, new class extends EnrollmentService
    {
        public function createFromOrder(Order $order): Enrollment
        {
            throw new RuntimeException('Enrollment persistence failed.');
        }
    });

    $this->withoutExceptionHandling();

    try {
        $this->postJson("/api/v1/orders/{$orderId}/pay", [
            'payment_method' => 'card',
            'outcome' => 'success',
        ]);
        $this->fail('Expected enrollment persistence to fail.');
    } catch (RuntimeException $exception) {
        $this->assertSame('Enrollment persistence failed.', $exception->getMessage());
    }

    expect(Order::findOrFail($orderId)->status)->toBe('pending');
    expect(Enrollment::query()->where('order_id', $orderId)->exists())->toBeFalse();
});

it('reuses one server idempotency key when payment finalization is retried', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published']);
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();
    $orderId = $this->postJson('/api/v1/orders', ['course_id' => $course->id])->json('data.id');
    $gateway = new class implements PaymentGateway
    {
        /** @var list<string|null> */
        public array $keys = [];

        public function charge(Order $order, array $data): PaymentResult
        {
            $this->keys[] = $data['idempotency_key'] ?? null;

            return new PaymentResult(true, 'PROVIDER-REFERENCE');
        }
    };
    $enrollmentService = new class extends EnrollmentService
    {
        public int $calls = 0;

        public function createFromOrder(Order $order): Enrollment
        {
            if (++$this->calls === 1) {
                throw new RuntimeException('Enrollment persistence failed once.');
            }

            return parent::createFromOrder($order);
        }
    };
    $this->app->instance(PaymentGateway::class, $gateway);
    $this->app->instance(EnrollmentService::class, $enrollmentService);
    $this->withoutExceptionHandling();

    try {
        $this->postJson("/api/v1/orders/{$orderId}/pay", ['payment_method' => 'card']);
        $this->fail('Expected enrollment persistence to fail once.');
    } catch (RuntimeException $exception) {
        $this->assertSame('Enrollment persistence failed once.', $exception->getMessage());
    }

    expect(Order::findOrFail($orderId)->status)->toBe('pending');
    $this->postJson("/api/v1/orders/{$orderId}/pay", ['payment_method' => 'card'])->assertOk();

    expect($gateway->keys)->toHaveCount(2);
    expect($gateway->keys[0])->not->toBeNull()->toBe($gateway->keys[1]);
    expect(Enrollment::query()->where('order_id', $orderId)->exists())->toBeTrue();
});

it('keeps the prepared payment key and amount immutable while the gateway is running', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published', 'price' => 100000]);
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();
    $orderId = $this->postJson('/api/v1/orders', ['course_id' => $course->id])->json('data.id');
    $gateway = new class($user, $course) implements PaymentGateway
    {
        public ?string $preparedKey = null;

        public ?string $keyAfterRepeatedCreate = null;

        public ?string $amountAfterRepeatedCreate = null;

        public function __construct(private User $user, private Course $course) {}

        public function charge(Order $order, array $data): PaymentResult
        {
            $this->preparedKey = $data['idempotency_key'] ?? null;
            $this->course->update(['price' => 125000]);
            $reusedOrder = app(CartService::class)->createPendingOrder($this->user, $this->course->id);
            $this->keyAfterRepeatedCreate = $reusedOrder->transaction_ref;
            $this->amountAfterRepeatedCreate = (string) $reusedOrder->amount;

            return new PaymentResult(true, 'IMMUTABLE-ATTEMPT-TEST');
        }
    };
    $this->app->instance(PaymentGateway::class, $gateway);

    $this->postJson("/api/v1/orders/{$orderId}/pay", ['payment_method' => 'card'])->assertOk();

    expect($gateway->preparedKey)->not->toBeNull()->toBe($gateway->keyAfterRepeatedCreate);
    expect($gateway->amountAfterRepeatedCreate)->toBe('100000.00');
    expect((string) Order::findOrFail($orderId)->amount)->toBe('100000.00');
    expect(Order::query()->where('user_id', $user->id)->where('course_id', $course->id)->count())->toBe(1);
});

it('prevents buying a course the student already owns', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published']);
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

    $this->postJson('/api/v1/orders', ['course_id' => $course->id])->assertStatus(422);
});

it('allows repurchase when the previous enrollment has expired', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $historicalOrder = Order::factory()->create([
        'user_id' => $user->id,
        'course_id' => $course->id,
        'status' => 'paid',
        'paid_at' => now()->subYears(2),
    ]);
    Enrollment::factory()->create([
        'user_id' => $user->id,
        'course_id' => $course->id,
        'order_id' => $historicalOrder->id,
        'status' => 'active',
        'expires_at' => now()->subDay(),
    ]);
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();
    $newOrderId = $this->postJson('/api/v1/orders', ['course_id' => $course->id])
        ->assertCreated()
        ->json('data.id');
    $this->postJson("/api/v1/orders/{$newOrderId}/pay", ['payment_method' => 'qr'])->assertOk();

    expect($newOrderId)->not->toBe($historicalOrder->id);
    expect(Enrollment::query()->where('user_id', $user->id)->where('course_id', $course->id)->value('order_id'))
        ->toBe($newOrderId);
});

it('does not charge an already paid order again', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published']);
    Sanctum::actingAs($user);
    $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();
    $orderId = $this->postJson('/api/v1/orders', ['course_id' => $course->id])->json('data.id');
    $gateway = new class implements PaymentGateway
    {
        public int $charges = 0;

        public function charge(Order $order, array $data): PaymentResult
        {
            $this->charges++;

            return new PaymentResult(true, 'IDEMPOTENT-TEST');
        }
    };
    $this->app->instance(PaymentGateway::class, $gateway);

    $this->postJson("/api/v1/orders/{$orderId}/pay", ['payment_method' => 'card'])->assertOk();
    $this->postJson("/api/v1/orders/{$orderId}/pay", ['payment_method' => 'card'])->assertUnprocessable();

    expect($gateway->charges)->toBe(1);
});
