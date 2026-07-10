<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReviewFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'course_id' => Course::factory(),
            'rating' => fake()->numberBetween(3, 5),
            'comment' => fake()->sentence(),
            'status' => 'visible',
        ];
    }
}
