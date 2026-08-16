<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OrderEnrollmentContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_and_enrollment_schema_is_expanded_without_contracting_legacy_fields(): void
    {
        $this->assertTrue(Schema::hasColumn('orders', 'amount'));
        $this->assertTrue(Schema::hasColumn('orders', 'total_amount'));
        $this->assertTrue(Schema::hasColumn('orders', 'course_id'));
        $this->assertTrue(Schema::hasColumn('enrollments', 'user_id'));
        $this->assertTrue(Schema::hasColumn('enrollments', 'order_id'));

        $enrollment = Enrollment::factory()->create(['order_id' => null]);

        $this->assertNull($enrollment->order_id);
    }

    public function test_order_total_is_dual_written_without_changing_the_student_api(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create([
            'status' => 'published',
            'price' => 299000,
        ]);
        $token = $student->createToken('test')->plainTextToken;
        $this->withToken($token)->postJson('/api/v1/cart/items', [
            'course_id' => $course->id,
        ])->assertCreated();

        $response = $this->withToken($token)->postJson('/api/v1/orders', [
            'course_id' => $course->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.course_id', $course->id)
            ->assertJsonPath('data.amount', '299000.00');

        $order = Order::query()->findOrFail($response->json('data.id'));

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'course_id' => $course->id,
            'amount' => 299000,
            'total_amount' => 299000,
        ]);

        $order->update(['total_amount' => 399000]);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'amount' => 399000,
            'total_amount' => 399000,
        ]);
    }
}
