<?php

use App\Models\Answer;
use App\Models\Course;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\Question;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature');

/**
 * Tạo 1 khóa học đầy đủ: N bài học + 1 exam (pass 75, max 2 lần) với 4 câu hỏi,
 * mỗi câu 2 đáp án (đáp án đầu là đúng).
 */
function makeCourseWithContent(int $lessons = 3): Course
{
    $course = Course::factory()->create(['price' => 299000]);

    for ($i = 1; $i <= $lessons; $i++) {
        Lesson::factory()->create(['course_id' => $course->id, 'sort_order' => $i]);
    }

    $exam = Exam::factory()->create([
        'course_id' => $course->id,
        'pass_score' => 75,
        'max_attempts' => 2,
    ]);

    for ($q = 0; $q < 4; $q++) {
        $question = Question::factory()->create(['exam_id' => $exam->id]);
        Answer::factory()->correct()->create(['question_id' => $question->id]);
        Answer::factory()->create(['question_id' => $question->id]);
    }

    return $course->load('lessons', 'quiz.questions.answers');
}

/**
 * Dựng payload đáp án cho bài thi: đúng hết hoặc sai hết.
 *
 * @return array<int, array{question_id:int, option_id:int}>
 */
function quizAnswers(Course $course, bool $correct): array
{
    return $course->quiz->questions->map(function (Question $question) use ($correct) {
        $answer = $correct
            ? $question->answers->firstWhere('is_correct', true)
            : $question->answers->firstWhere('is_correct', false);

        return ['question_id' => $question->id, 'option_id' => $answer->id];
    })->all();
}
