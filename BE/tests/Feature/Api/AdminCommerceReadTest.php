<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCommerceReadTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_read_order_list_and_detail(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $order = Order::factory()->paid()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'amount' => 299000,
        ]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/orders')
            ->assertOk()
            ->assertJsonPath('data.0.id', $order->id)
            ->assertJsonPath('data.0.total_amount', '299000.00')
            ->assertJsonPath('data.0.user.id', $student->id)
            ->assertJsonPath('data.0.course.id', $course->id);

        $this->withToken($token)->getJson("/api/v1/admin/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.status', 'paid');
    }

    public function test_admin_can_read_enrollment_list_and_detail(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        $course = Course::factory()->create();
        $order = Order::factory()->paid()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);
        $enrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'order_id' => $order->id,
        ]);
        $token = $admin->createToken('test')->plainTextToken;

        Enrollment::factory()->create();

        $this->withToken($token)->getJson("/api/v1/admin/enrollments?course_id={$course->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $enrollment->id)
            ->assertJsonPath('data.0.user_id', $student->id)
            ->assertJsonPath('data.0.order_id', $order->id)
            ->assertJsonPath('data.0.user.id', $student->id)
            ->assertJsonPath('data.0.course.id', $course->id);

        $this->withToken($token)->getJson("/api/v1/admin/enrollments/{$enrollment->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $enrollment->id)
            ->assertJsonPath('data.order.id', $order->id);
    }

    public function test_student_cannot_read_admin_commerce_records(): void
    {
        $student = User::factory()->create();
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/orders')->assertForbidden();
        $this->withToken($token)->getJson('/api/v1/admin/enrollments')->assertForbidden();
    }
}
