<?php

namespace Tests\Feature\Api;

use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProtectedDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_with_enrollment_returns_structured_conflict(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        Enrollment::factory()->create(['course_id' => $course->id]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->deleteJson("/api/v1/admin/courses/{$course->id}")
            ->assertStatus(409)
            ->assertJsonPath('code', 'resource_has_dependencies')
            ->assertJsonPath('dependencies.enrollments', 1);

        $this->assertDatabaseHas('courses', ['id' => $course->id]);
    }

    public function test_lesson_file_is_not_deleted_when_learning_progress_exists(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('lesson-materials/guide.pdf', 'pdf');
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $lesson = Lesson::factory()->create([
            'course_id' => $course->id,
            'material_url' => '/storage/lesson-materials/guide.pdf',
        ]);
        $enrollment = Enrollment::factory()->create(['course_id' => $course->id]);
        LearningProgress::create(['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->deleteJson("/api/v1/admin/lessons/{$lesson->id}")
            ->assertStatus(409)
            ->assertJsonPath('dependencies.learning_progress', 1);

        Storage::disk('public')->assertExists('lesson-materials/guide.pdf');
        $this->assertDatabaseHas('lessons', ['id' => $lesson->id]);
    }

    public function test_question_snapshot_blocks_update_and_delete(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        $enrollment = Enrollment::factory()->create(['course_id' => $course->id]);
        $exam = Exam::factory()->create(['course_id' => $course->id]);
        $question = Question::factory()->create(['exam_id' => $exam->id]);
        $answer = Answer::factory()->correct()->create(['question_id' => $question->id]);
        Answer::factory()->create(['question_id' => $question->id]);
        Attempt::create([
            'enrollment_id' => $enrollment->id,
            'exam_id' => $exam->id,
            'attempt_number' => 1,
            'status' => 'submitted',
            'score' => 100,
            'passed' => true,
            'correct_count' => 1,
            'wrong_count' => 0,
            'started_at' => now()->subMinute(),
            'finished_at' => now(),
            'submitted_at' => now(),
            'answers' => [['question_id' => $question->id, 'selected_answer_id' => $answer->id, 'is_correct' => true]],
        ]);
        $token = $admin->createToken('test')->plainTextToken;

        $payload = [
            'content' => 'Changed question',
            'options' => [
                ['content' => 'Yes', 'is_correct' => true],
                ['content' => 'No', 'is_correct' => false],
            ],
        ];
        $this->withToken($token)->putJson("/api/v1/admin/questions/{$question->id}", $payload)
            ->assertStatus(409)
            ->assertJsonPath('dependencies.attempts', 1);
        $this->withToken($token)->deleteJson("/api/v1/admin/questions/{$question->id}")
            ->assertStatus(409);

        $this->assertSame($question->content, $question->fresh()->content);
    }

    public function test_composition_without_history_can_still_be_deleted(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create();
        Lesson::factory()->create(['course_id' => $course->id]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->deleteJson("/api/v1/admin/courses/{$course->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('courses', ['id' => $course->id]);
    }
}
