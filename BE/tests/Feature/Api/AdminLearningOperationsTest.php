<?php

namespace Tests\Feature\Api;

use App\Models\Attempt;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminLearningOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_filter_real_lesson_and_exam_indexes(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create(['title' => 'SEO Operations']);
        $otherCourse = Course::factory()->create(['title' => 'Google Ads']);
        $lesson = Lesson::factory()->create([
            'course_id' => $course->id,
            'title' => 'Technical SEO foundation',
            'sort_order' => 2,
        ]);
        Lesson::factory()->create([
            'course_id' => $otherCourse->id,
            'title' => 'Campaign planning',
        ]);
        $exam = Exam::factory()->create([
            'course_id' => $course->id,
            'title' => 'Technical SEO assessment',
        ]);
        Question::factory()->count(2)->create(['exam_id' => $exam->id]);
        $enrollment = Enrollment::factory()->create(['course_id' => $course->id]);
        Attempt::query()->create([
            'enrollment_id' => $enrollment->id,
            'exam_id' => $exam->id,
            'score' => 80,
            'passed' => true,
            'attempt_number' => 1,
            'correct_count' => 2,
            'wrong_count' => 0,
            'answers' => [],
            'submitted_at' => now(),
        ]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/v1/admin/lessons?q=Technical&course_id={$course->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $lesson->id)
            ->assertJsonPath('data.0.course.id', $course->id)
            ->assertJsonPath('data.0.title', 'Technical SEO foundation')
            ->assertJsonPath('data.0.position', 2)
            ->assertJsonPath('data.0.learning_progress_count', 0);

        $this->withToken($token)
            ->getJson("/api/v1/admin/exams?q=assessment&course_id={$course->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $exam->id)
            ->assertJsonPath('data.0.course.id', $course->id)
            ->assertJsonPath('data.0.questions_count', 2)
            ->assertJsonPath('data.0.attempts_count', 1);
    }

    public function test_admin_can_filter_attempts_by_real_relations_and_passed_state(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create(['name' => 'Nguyễn Văn An', 'email' => 'an@example.test']);
        $course = Course::factory()->create(['title' => 'Content Strategy']);
        $exam = Exam::factory()->create(['course_id' => $course->id, 'title' => 'Final Content Exam']);
        $enrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);
        $attempt = Attempt::query()->create([
            'enrollment_id' => $enrollment->id,
            'exam_id' => $exam->id,
            'score' => 90,
            'passed' => true,
            'attempt_number' => 2,
            'correct_count' => 9,
            'wrong_count' => 1,
            'answers' => [],
            'submitted_at' => now(),
        ]);
        Attempt::query()->create([
            'enrollment_id' => Enrollment::factory()->create()->id,
            'exam_id' => Exam::factory()->create()->id,
            'score' => 40,
            'passed' => false,
            'attempt_number' => 1,
            'correct_count' => 4,
            'wrong_count' => 6,
            'answers' => [],
            'submitted_at' => now()->subMinute(),
        ]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/v1/admin/attempts?q=an%40example.test&course_id={$course->id}&user_id={$student->id}&passed=1")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $attempt->id)
            ->assertJsonPath('data.0.attempt_number', 2)
            ->assertJsonPath('data.0.user.id', $student->id)
            ->assertJsonPath('data.0.course.id', $course->id)
            ->assertJsonPath('data.0.exam.id', $exam->id);
    }

    public function test_admin_certificate_index_derives_not_eligible_eligible_and_issued_states(): void
    {
        $admin = User::factory()->admin()->create();
        $course = Course::factory()->create(['title' => 'Social Content']);
        $lessons = Lesson::factory()->count(2)->create(['course_id' => $course->id]);
        $exam = Exam::factory()->create(['course_id' => $course->id]);

        $notEligible = Enrollment::factory()->create(['course_id' => $course->id]);
        $this->completeLessons($notEligible, $lessons->take(1));

        $eligible = Enrollment::factory()->create(['course_id' => $course->id]);
        $this->completeLessons($eligible, $lessons);
        $eligibleAttempt = $this->passingAttempt($eligible, $exam, 88);

        $issued = Enrollment::factory()->create(['course_id' => $course->id]);
        $this->completeLessons($issued, $lessons);
        $this->passingAttempt($issued, $exam, 95);
        Certificate::query()->create([
            'enrollment_id' => $issued->id,
            'certificate_code' => 'SEONGON-ISSUED-001',
            'issued_at' => now(),
        ]);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/admin/certificates?status=not_eligible')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.enrollment_id', $notEligible->id)
            ->assertJsonPath('data.0.state', 'not_eligible')
            ->assertJsonPath('data.0.completed_lessons', 1)
            ->assertJsonPath('data.0.total_lessons', 2);

        $this->withToken($token)
            ->getJson('/api/v1/admin/certificates?status=eligible')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.enrollment_id', $eligible->id)
            ->assertJsonPath('data.0.state', 'eligible')
            ->assertJsonPath('data.0.latest_passing_attempt.id', $eligibleAttempt->id)
            ->assertJsonPath('data.0.certificate', null);

        $this->withToken($token)
            ->getJson('/api/v1/admin/certificates?status=issued')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.enrollment_id', $issued->id)
            ->assertJsonPath('data.0.state', 'issued')
            ->assertJsonPath('data.0.certificate.certificate_code', 'SEONGON-ISSUED-001');
    }

    public function test_student_cannot_access_admin_learning_operation_indexes(): void
    {
        $student = User::factory()->create();
        $token = $student->createToken('test')->plainTextToken;

        foreach (['lessons', 'exams', 'attempts', 'certificates'] as $endpoint) {
            $this->withToken($token)->getJson("/api/v1/admin/{$endpoint}")->assertForbidden();
        }
    }

    private function completeLessons(Enrollment $enrollment, iterable $lessons): void
    {
        foreach ($lessons as $lesson) {
            LearningProgress::query()->create([
                'enrollment_id' => $enrollment->id,
                'lesson_id' => $lesson->id,
                'is_completed' => true,
                'completed_at' => now(),
            ]);
        }
    }

    private function passingAttempt(Enrollment $enrollment, Exam $exam, int $score): Attempt
    {
        return Attempt::query()->create([
            'enrollment_id' => $enrollment->id,
            'exam_id' => $exam->id,
            'score' => $score,
            'passed' => true,
            'attempt_number' => 1,
            'correct_count' => 8,
            'wrong_count' => 2,
            'answers' => [],
            'submitted_at' => now(),
        ]);
    }
}
