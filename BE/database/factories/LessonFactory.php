<?php

namespace Database\Factories;

use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LessonFactory extends Factory
{
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'title' => Str::title(fake()->words(4, true)),
            'video_url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            'description' => fake()->sentence(),
            'duration' => fake()->numberBetween(120, 1800),
            'position' => 1,
        ];
    }
}
