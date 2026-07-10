<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CourseFactory extends Factory
{
    public function definition(): array
    {
        $title = Str::title(fake()->unique()->words(3, true));

        return [
            'category_id' => Category::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1, 1000000),
            'description' => fake()->paragraphs(3, true),
            'thumbnail' => 'https://picsum.photos/seed/'.fake()->uuid().'/600/400',
            'price' => fake()->randomElement([0, 199000, 299000, 499000, 799000]),
            'instructor_name' => fake()->name(),
            'instructor_bio' => fake()->sentence(),
            'level' => fake()->randomElement(['beginner', 'intermediate', 'advanced']),
            'status' => 'published',
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['status' => 'draft']);
    }
}
