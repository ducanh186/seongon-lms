<?php

namespace Database\Factories;

use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;

class QuizFactory extends Factory
{
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'title' => 'Bài kiểm tra cuối khóa',
            'pass_score' => 75,
            'max_attempts' => 3,
        ];
    }
}
