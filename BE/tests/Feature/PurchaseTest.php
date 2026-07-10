<?php

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('creates a pending order, pays successfully and enrolls for 1 year', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published', 'price' => 299000]);
    Sanctum::actingAs($user);

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

    $orderId = $this->postJson('/api/v1/orders', ['course_id' => $course->id])->json('data.id');

    $this->postJson("/api/v1/orders/{$orderId}/pay", [
        'payment_method' => 'qr',
        'outcome' => 'failure',
    ])->assertStatus(422);

    expect(Order::find($orderId)->status)->toBe('failed');
    expect(Enrollment::where('user_id', $user->id)->count())->toBe(0);
});

it('prevents buying a course the student already owns', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['status' => 'published']);
    Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/orders', ['course_id' => $course->id])->assertStatus(422);
});
