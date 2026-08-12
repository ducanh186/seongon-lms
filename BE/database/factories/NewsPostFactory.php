<?php

namespace Database\Factories;

use App\Models\NewsPost;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class NewsPostFactory extends Factory
{
    protected $model = NewsPost::class;

    public function definition(): array
    {
        $title = Str::title(fake()->unique()->words(3, true));

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1, 1000000),
            'category' => fake()->randomElement(['Announcements', 'Learning', 'Events']),
            'excerpt' => fake()->sentence(),
            'content' => fake()->paragraphs(3, true),
            'thumbnail' => '/generated-images/catalog-hero.webp',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => [
            'status' => 'draft',
            'published_at' => null,
        ]);
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]);
    }
}
