<?php

namespace Tests\Feature;

use App\Models\Attempt;
use App\Models\Enrollment;
use App\Models\Exam;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AttemptLifecycleSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_in_progress_attempt_can_exist_without_result_fields(): void
    {
        $enrollment = Enrollment::factory()->create();
        $exam = Exam::factory()->create(['course_id' => $enrollment->course_id]);

        $this->assertTrue(Schema::hasColumns('attempts', ['status', 'started_at', 'expires_at', 'finished_at']));
        $attempt = Attempt::create([
            'enrollment_id' => $enrollment->id,
            'exam_id' => $exam->id,
            'attempt_number' => 1,
            'status' => 'in_progress',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(30),
            'answers' => [],
        ]);

        $this->assertNull($attempt->score);
        $this->assertNull($attempt->passed);
        $this->assertNull($attempt->finished_at);
    }
}
