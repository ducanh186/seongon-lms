<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Category;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinalBusinessRulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_enrolled_courses_and_used_categories_cannot_be_deleted(): void
    {
        $course = Course::factory()->create();
        Enrollment::factory()->create(['course_id' => $course->id]);
        $this->actingAs(User::factory()->admin()->create());
        $this->deleteJson("/api/v1/admin/courses/{$course->id}")->assertUnprocessable();
        $this->deleteJson("/api/v1/admin/categories/{$course->category_id}")->assertUnprocessable();
        $this->assertDatabaseHas('courses', ['id' => $course->id]);
        $this->assertDatabaseCount('enrollments', 1);
    }

    public function test_duplicate_course_and_category_names_are_rejected_but_own_name_can_be_saved(): void
    {
        $course = Course::factory()->create(['status' => 'draft']);
        $this->actingAs(User::factory()->admin()->create());
        $body = ['title' => $course->title, 'category_id' => $course->category_id, 'price' => 0, 'status' => 'draft'];
        $this->postJson('/api/v1/admin/courses', $body)->assertUnprocessable();
        $this->putJson("/api/v1/admin/courses/{$course->id}", $body)->assertOk();
        $category = Category::findOrFail($course->category_id);
        $this->postJson('/api/v1/admin/categories', ['name' => $category->name])->assertUnprocessable();
        $this->putJson("/api/v1/admin/categories/{$category->id}", ['name' => $category->name])->assertOk();
    }

    public function test_publishing_requires_lessons_exam_and_five_valid_questions(): void
    {
        $course = Course::factory()->create(['status' => 'draft']);
        $this->actingAs(User::factory()->admin()->create());
        $url = "/api/v1/admin/courses/{$course->id}/publish";
        $this->patchJson($url, ['status' => 'published'])->assertUnprocessable();
        Lesson::factory()->create(['course_id' => $course->id]);
        $exam = Exam::factory()->create(['course_id' => $course->id]);
        foreach (range(1, 5) as $index) {
            $question = Question::factory()->create(['exam_id' => $exam->id]);
            Answer::factory()->create(['question_id' => $question->id, 'is_correct' => true]);
            Answer::factory()->create(['question_id' => $question->id, 'is_correct' => false]);
            if ($index < 5) {
                $this->patchJson($url, ['status' => 'published'])->assertUnprocessable();
            }
        }
        $this->patchJson($url, ['status' => 'published'])->assertOk();
    }

    public function test_question_requires_exactly_one_correct_answer(): void
    {
        $exam = Exam::factory()->create();
        $this->actingAs(User::factory()->admin()->create());
        foreach ([false, true] as $correct) {
            $this->postJson("/api/v1/admin/quizzes/{$exam->id}/questions", [
                'content' => 'Which answer?',
                'options' => [['content' => 'A', 'is_correct' => $correct], ['content' => 'B', 'is_correct' => $correct]],
            ])->assertUnprocessable();
        }
        $this->assertDatabaseCount('questions', 0);
    }

    public function test_exam_cannot_be_opened_before_all_lessons_are_complete(): void
    {
        $enrollment = Enrollment::factory()->create();
        Lesson::factory()->create(['course_id' => $enrollment->course_id]);
        Exam::factory()->create(['course_id' => $enrollment->course_id]);
        $this->actingAs($enrollment->user)->getJson("/api/v1/my/courses/{$enrollment->course_id}/quiz")->assertForbidden();
    }
}
