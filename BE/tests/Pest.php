<?php

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature');

/**
 * Tạo 1 khóa học đầy đủ: N bài học + 1 quiz (pass 75, max 2 lần) với 4 câu hỏi,
 * mỗi câu 2 đáp án (đáp án đầu là đúng).
 */
function makeCourseWithContent(int $lessons = 3): Course
{
    $course = Course::factory()->create(['price' => 299000]);

    for ($i = 1; $i <= $lessons; $i++) {
        Lesson::factory()->create(['course_id' => $course->id, 'position' => $i]);
    }

    $quiz = Quiz::factory()->create([
        'course_id' => $course->id,
        'pass_score' => 75,
        'max_attempts' => 2,
    ]);

    for ($q = 0; $q < 4; $q++) {
        $question = Question::factory()->create(['quiz_id' => $quiz->id]);
        QuestionOption::factory()->correct()->create(['question_id' => $question->id]);
        QuestionOption::factory()->create(['question_id' => $question->id]);
    }

    return $course->load('lessons', 'quiz.questions.options');
}

/**
 * Dựng payload đáp án cho bài thi: đúng hết hoặc sai hết.
 *
 * @return array<int, array{question_id:int, option_id:int}>
 */
function quizAnswers(Course $course, bool $correct): array
{
    return $course->quiz->questions->map(function (Question $question) use ($correct) {
        $option = $correct
            ? $question->options->firstWhere('is_correct', true)
            : $question->options->firstWhere('is_correct', false);

        return ['question_id' => $question->id, 'option_id' => $option->id];
    })->all();
}
