<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EnrollmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'course_id' => Course::factory(),
            'order_id' => null,
            'enrolled_at' => now(),
            'expires_at' => now()->addYear(),
            'status' => 'active',
        ];
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'enrolled_at' => now()->subYears(2),
            'expires_at' => now()->subYear(),
            'status' => 'active',
        ]);
    }
}
