<?php

namespace Database\Factories;

use App\Models\Question;
use Illuminate\Database\Eloquent\Factories\Factory;

class QuestionOptionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'question_id' => Question::factory(),
            'content' => fake()->words(3, true),
            'is_correct' => false,
        ];
    }

    public function correct(): static
    {
        return $this->state(fn () => ['is_correct' => true]);
    }
}
