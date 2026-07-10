<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Order;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // ----- Tài khoản -----
        User::factory()->admin()->create([
            'name' => 'SEONGON Admin',
            'email' => 'admin@seongon.vn',
        ]);

        $student = User::factory()->create([
            'name' => 'Học viên Demo',
            'email' => 'student@seongon.vn',
        ]);

        // ----- Danh mục -----
        $categories = collect(['Marketing', 'SEO', 'Content', 'Quảng cáo'])
            ->map(fn (string $name) => Category::factory()->create([
                'name' => $name,
                'slug' => Str::slug($name),
            ]));

        // ----- Khóa học + bài học + bài kiểm tra -----
        $categories->each(function (Category $category) {
            Course::factory()->count(3)->create(['category_id' => $category->id])
                ->each(function (Course $course) {
                    for ($i = 1; $i <= 5; $i++) {
                        Lesson::factory()->create([
                            'course_id' => $course->id,
                            'title' => "Bài {$i}: ".Str::title(fake()->words(3, true)),
                            'position' => $i,
                        ]);
                    }

                    $quiz = Quiz::factory()->create(['course_id' => $course->id]);

                    for ($q = 1; $q <= 4; $q++) {
                        $question = Question::factory()->create(['quiz_id' => $quiz->id]);
                        $correctIndex = fake()->numberBetween(0, 3);

                        for ($o = 0; $o < 4; $o++) {
                            QuestionOption::factory()->create([
                                'question_id' => $question->id,
                                'is_correct' => $o === $correctIndex,
                            ]);
                        }
                    }
                });
        });

        // ----- Vài đánh giá -----
        Course::query()->take(5)->get()->each(
            fn (Course $course) => Review::factory()->count(3)->create(['course_id' => $course->id]),
        );

        // ----- Ghi danh sẵn cho học viên demo (1 khóa) -----
        $firstCourse = Course::query()->first();
        $order = Order::factory()->paid()->create([
            'user_id' => $student->id,
            'course_id' => $firstCourse->id,
            'amount' => $firstCourse->price,
        ]);
        Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $firstCourse->id,
            'order_id' => $order->id,
        ]);
    }
}
