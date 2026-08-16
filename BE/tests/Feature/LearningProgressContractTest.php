<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LearningProgressContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_learning_schema_is_expanded_without_contracting_legacy_names(): void
    {
        $this->assertTrue(Schema::hasTable('learning_progress'));
        $this->assertTrue(Schema::hasTable('lesson_progress'));
        $this->assertTrue(Schema::hasColumn('lessons', 'sort_order'));
        $this->assertTrue(Schema::hasColumn('lessons', 'position'));
    }

    public function test_student_learning_api_uses_new_models_without_changing_legacy_payload_fields(): void
    {
        $this->assertTrue(class_exists(LearningProgress::class));

        $student = User::factory()->create();
        $course = Course::factory()->create();
        $enrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);
        $secondLesson = Lesson::query()->create([
            'course_id' => $course->id,
            'title' => 'Second lesson',
            'video_url' => 'https://example.com/second',
            'sort_order' => 2,
        ]);
        $firstLesson = Lesson::query()->create([
            'course_id' => $course->id,
            'title' => 'First lesson',
            'video_url' => 'https://example.com/first',
            'sort_order' => 1,
        ]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/my/courses/{$course->id}/lessons")
            ->assertOk()
            ->assertJsonPath('data.0.id', $firstLesson->id)
            ->assertJsonPath('data.0.position', 1)
            ->assertJsonPath('data.1.id', $secondLesson->id)
            ->assertJsonPath('data.1.position', 2);

        $this->withToken($token)->postJson("/api/v1/my/lessons/{$firstLesson->id}/complete")
            ->assertOk()
            ->assertJsonPath('completed', 1)
            ->assertJsonPath('percent', 50);

        $this->assertDatabaseHas('learning_progress', [
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $firstLesson->id,
            'is_completed' => true,
        ]);
        $this->assertDatabaseHas('lesson_progress', [
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $firstLesson->id,
            'is_completed' => true,
        ]);
        $this->assertDatabaseHas('lessons', [
            'id' => $firstLesson->id,
            'position' => 1,
            'sort_order' => 1,
        ]);

        LearningProgress::query()
            ->where('enrollment_id', $enrollment->id)
            ->where('lesson_id', $firstLesson->id)
            ->firstOrFail()
            ->delete();

        $this->assertDatabaseMissing('lesson_progress', [
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $firstLesson->id,
        ]);
        $this->assertDatabaseMissing('learning_progress', [
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $firstLesson->id,
        ]);
    }
}
