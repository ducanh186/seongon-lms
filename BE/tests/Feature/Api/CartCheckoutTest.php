<?php

namespace Tests\Feature\Api;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use App\Services\Payment\PaymentGateway;
use App\Services\Payment\PaymentResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CartCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_cart_01_authenticated_student_starts_with_an_empty_db_cart(): void
    {
        $student = User::factory()->create();
        Sanctum::actingAs($student);

        $this->getJson('/api/v1/cart')
            ->assertOk()
            ->assertJsonPath('data.id', null)
            ->assertJsonPath('data.count', 0)
            ->assertJsonPath('data.items', []);

        $this->assertDatabaseCount('carts', 0);
    }

    public function test_cart_02_add_course_creates_cart_if_none_exists(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();

        $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();

        $this->assertDatabaseHas('carts', ['user_id' => $student->id]);
        $this->assertDatabaseCount('carts', 1);
    }

    public function test_cart_03_add_course_creates_cart_item_from_authoritative_course(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse(['price' => 299000]);

        $this->postJson('/api/v1/cart/items', [
            'course_id' => $course->id,
            'price' => 1,
            'title' => 'Fabricated title',
            'user_id' => User::factory()->create()->id,
        ])->assertCreated()
            ->assertJsonPath('data.count', 1)
            ->assertJsonPath('data.total_amount', '299000.00')
            ->assertJsonPath('data.items.0.course.title', $course->title)
            ->assertJsonPath('data.items.0.course.price', '299000.00');

        $cart = Cart::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $cart->id,
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);
    }

    public function test_cart_04_duplicate_course_remains_one_item(): void
    {
        [, $course] = $this->studentAndPublishedCourse();

        $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertCreated();
        $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])
            ->assertOk()
            ->assertJsonPath('data.count', 1);

        $this->assertDatabaseCount('cart_items', 1);
    }

    public function test_cart_05_student_cannot_add_an_already_enrolled_course(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

        $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Bạn đã sở hữu khóa học này.');

        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_cart_06_get_cart_returns_only_authenticated_users_items(): void
    {
        [$student, $ownCourse] = $this->studentAndPublishedCourse();
        $otherStudent = User::factory()->create();
        $otherCourse = Course::factory()->create(['status' => 'published']);
        $ownCart = Cart::query()->create(['user_id' => $student->id]);
        $otherCart = Cart::query()->create(['user_id' => $otherStudent->id]);
        CartItem::query()->create(['cart_id' => $ownCart->id, 'user_id' => $student->id, 'course_id' => $ownCourse->id]);
        CartItem::query()->create(['cart_id' => $otherCart->id, 'user_id' => $otherStudent->id, 'course_id' => $otherCourse->id]);

        $this->getJson('/api/v1/cart')
            ->assertOk()
            ->assertJsonPath('data.count', 1)
            ->assertJsonPath('data.items.0.course_id', $ownCourse->id)
            ->assertJsonMissing(['course_id' => $otherCourse->id]);
    }

    public function test_cart_07_student_cannot_delete_another_users_cart_item(): void
    {
        [$student] = $this->studentAndPublishedCourse();
        $otherStudent = User::factory()->create();
        $otherCourse = Course::factory()->create(['status' => 'published']);
        $otherCart = Cart::query()->create(['user_id' => $otherStudent->id]);
        $otherItem = CartItem::query()->create(['cart_id' => $otherCart->id, 'user_id' => $otherStudent->id, 'course_id' => $otherCourse->id]);

        $this->deleteJson("/api/v1/cart/items/{$otherItem->id}")->assertForbidden();

        $this->assertDatabaseHas('cart_items', ['id' => $otherItem->id]);
        $this->assertSame($student->id, auth()->id());
    }

    public function test_cart_08_remove_item_deletes_the_cart_item(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $cart = Cart::query()->create(['user_id' => $student->id]);
        $item = CartItem::query()->create(['cart_id' => $cart->id, 'user_id' => $student->id, 'course_id' => $course->id]);

        $this->deleteJson("/api/v1/cart/items/{$item->id}")
            ->assertOk()
            ->assertJsonPath('data.count', 0);

        $this->assertDatabaseMissing('cart_items', ['id' => $item->id]);
    }

    public function test_clear_cart_deletes_only_the_authenticated_users_cart_and_items(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $this->addToCart($course);
        $otherStudent = User::factory()->create();
        $otherCart = Cart::query()->create(['user_id' => $otherStudent->id]);
        $otherItem = CartItem::query()->create([
            'cart_id' => $otherCart->id,
            'user_id' => $otherStudent->id,
            'course_id' => Course::factory()->create(['status' => 'published'])->id,
        ]);

        $this->deleteJson('/api/v1/cart')->assertNoContent();

        $this->assertDatabaseMissing('carts', ['user_id' => $student->id]);
        $this->assertDatabaseHas('carts', ['id' => $otherCart->id]);
        $this->assertDatabaseHas('cart_items', ['id' => $otherItem->id]);
    }

    public function test_add_rejects_nonexistent_and_unpublished_courses(): void
    {
        $student = User::factory()->create();
        Sanctum::actingAs($student);

        $this->postJson('/api/v1/cart/items', ['course_id' => 999999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('course_id');

        $draft = Course::factory()->create(['status' => 'draft']);
        $this->postJson('/api/v1/cart/items', ['course_id' => $draft->id])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Khóa học không còn mở đăng ký.');

        $this->assertDatabaseCount('carts', 0);
        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_multiple_courses_share_one_authenticated_user_cart(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $secondCourse = Course::factory()->create(['status' => 'published']);

        $this->addToCart($course);
        $this->addToCart($secondCourse);

        $this->assertDatabaseCount('carts', 1);
        $this->assertDatabaseCount('cart_items', 2);
        $this->assertDatabaseHas('carts', ['user_id' => $student->id]);
    }

    public function test_guest_and_admin_cannot_access_student_cart_endpoints(): void
    {
        $course = Course::factory()->create(['status' => 'published']);
        $this->getJson('/api/v1/cart')->assertUnauthorized();
        $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertUnauthorized();

        Sanctum::actingAs(User::factory()->admin()->create());
        $this->getJson('/api/v1/cart')->assertForbidden();
        $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertForbidden();
    }

    public function test_get_cart_reconciles_a_course_that_became_unpublished(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $this->addToCart($course);
        $course->update(['status' => 'draft']);

        $this->getJson('/api/v1/cart')
            ->assertOk()
            ->assertJsonPath('data.count', 0);

        $this->assertDatabaseMissing('cart_items', ['user_id' => $student->id, 'course_id' => $course->id]);
    }

    public function test_cart_10_checkout_rejects_a_course_outside_the_db_cart(): void
    {
        [, $course] = $this->studentAndPublishedCourse();

        $this->postJson('/api/v1/orders', ['course_id' => $course->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('course_id');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_cart_11_checkout_creates_single_course_order_with_current_db_price(): void
    {
        [, $course] = $this->studentAndPublishedCourse(['price' => 100000]);
        $this->addToCart($course);
        $course->update(['price' => 125000]);

        $this->postJson('/api/v1/orders', ['course_id' => $course->id, 'amount' => 1])
            ->assertCreated()
            ->assertJsonPath('data.amount', '125000.00');

        $this->assertDatabaseHas('orders', [
            'course_id' => $course->id,
            'amount' => 125000,
            'status' => 'pending',
        ]);
    }

    public function test_repeated_checkout_creation_reuses_one_pending_order_for_the_cart_item(): void
    {
        [, $course] = $this->studentAndPublishedCourse();
        $this->addToCart($course);

        $firstId = $this->createOrder($course);
        $secondId = $this->createOrder($course);

        $this->assertSame($firstId, $secondId);
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_only_the_canonical_pending_order_can_be_paid_if_legacy_duplicates_exist(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $this->addToCart($course);
        $canonical = Order::query()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'amount' => $course->price,
            'status' => 'pending',
        ]);
        $duplicate = Order::query()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'amount' => $course->price,
            'status' => 'pending',
        ]);
        $gateway = new class implements PaymentGateway
        {
            public int $charges = 0;

            public function charge(Order $order, array $data): PaymentResult
            {
                $this->charges++;

                return new PaymentResult(true, 'LEGACY-DUPLICATE-TEST');
            }
        };
        $this->app->instance(PaymentGateway::class, $gateway);

        $this->postJson("/api/v1/orders/{$duplicate->id}/pay", [
            'payment_method' => 'qr',
        ])->assertUnprocessable();
        $this->assertSame(0, $gateway->charges);

        $this->postJson("/api/v1/orders/{$canonical->id}/pay", [
            'payment_method' => 'qr',
        ])->assertOk();
        $this->assertSame(1, $gateway->charges);

        $this->postJson("/api/v1/orders/{$duplicate->id}/pay", [
            'payment_method' => 'qr',
        ])->assertUnprocessable();
        $this->assertSame(1, $gateway->charges);

        $this->assertDatabaseHas('orders', ['id' => $canonical->id, 'status' => 'paid']);
        $this->assertDatabaseHas('orders', ['id' => $duplicate->id, 'status' => 'pending']);
        $this->assertDatabaseCount('enrollments', 1);
    }

    public function test_checkout_cleans_an_item_if_its_course_became_unpublished(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $this->addToCart($course);
        $course->update(['status' => 'draft']);

        $this->postJson('/api/v1/orders', ['course_id' => $course->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('course_id');

        $this->assertDatabaseMissing('cart_items', ['user_id' => $student->id, 'course_id' => $course->id]);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_cart_12_successful_payment_creates_enrollment(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $this->addToCart($course);
        $orderId = $this->createOrder($course);

        $this->postJson("/api/v1/orders/{$orderId}/pay", [
            'payment_method' => 'qr',
            'outcome' => 'success',
        ])->assertOk();

        $this->assertDatabaseHas('enrollments', [
            'user_id' => $student->id,
            'course_id' => $course->id,
            'order_id' => $orderId,
        ]);
    }

    public function test_cart_13_successful_payment_removes_only_purchased_cart_item(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $secondCourse = Course::factory()->create(['status' => 'published']);
        $this->addToCart($course);
        $this->addToCart($secondCourse);
        $orderId = $this->createOrder($course);

        $this->postJson("/api/v1/orders/{$orderId}/pay", [
            'payment_method' => 'card',
            'outcome' => 'success',
        ])->assertOk();

        $this->assertDatabaseMissing('cart_items', ['user_id' => $student->id, 'course_id' => $course->id]);
        $this->assertDatabaseHas('cart_items', ['user_id' => $student->id, 'course_id' => $secondCourse->id]);
    }

    public function test_cart_14_failed_payment_preserves_cart_and_creates_no_enrollment(): void
    {
        [$student, $course] = $this->studentAndPublishedCourse();
        $this->addToCart($course);
        $orderId = $this->createOrder($course);

        $this->postJson("/api/v1/orders/{$orderId}/pay", [
            'payment_method' => 'qr',
            'outcome' => 'failure',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('cart_items', ['user_id' => $student->id, 'course_id' => $course->id]);
        $this->assertDatabaseMissing('enrollments', ['user_id' => $student->id, 'course_id' => $course->id]);
        $this->assertSame('failed', Order::query()->findOrFail($orderId)->status);
    }

    /**
     * @param  array<string, mixed>  $courseAttributes
     * @return array{User, Course}
     */
    private function studentAndPublishedCourse(array $courseAttributes = []): array
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'status' => 'published',
            ...$courseAttributes,
        ]);
        Sanctum::actingAs($student);

        return [$student, $course];
    }

    private function addToCart(Course $course): void
    {
        $this->postJson('/api/v1/cart/items', ['course_id' => $course->id])->assertSuccessful();
    }

    private function createOrder(Course $course): int
    {
        return (int) $this->postJson('/api/v1/orders', ['course_id' => $course->id])
            ->assertCreated()
            ->json('data.id');
    }
}
