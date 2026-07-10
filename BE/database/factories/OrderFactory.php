<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'course_id' => Course::factory(),
            'amount' => fake()->randomElement([199000, 299000, 499000]),
            'status' => 'pending',
            'payment_method' => null,
            'transaction_ref' => null,
            'paid_at' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status' => 'paid',
            'payment_method' => 'card',
            'transaction_ref' => 'MOCK-'.Str::upper(Str::random(10)),
            'paid_at' => now(),
        ]);
    }
}
