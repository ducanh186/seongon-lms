<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicCourseContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_course_counts_all_reviews_and_include_students(): void
    {
        $course = Course::factory()->create(['status' => 'published']);
        Review::factory()->create(['course_id' => $course->id, 'rating' => 5]);
        Review::factory()->create(['course_id' => $course->id, 'rating' => 1]);
        Enrollment::factory()->count(2)->create(['course_id' => $course->id]);

        $this->getJson('/api/v1/courses')->assertOk()
            ->assertJsonPath('data.0.reviews_count', 2)
            ->assertJsonPath('data.0.rating', 3)
            ->assertJsonPath('data.0.enrollments_count', 2);

        $this->getJson("/api/v1/courses/{$course->slug}")->assertOk()
            ->assertJsonPath('data.reviews_count', 2)
            ->assertJsonPath('data.rating', 3)
            ->assertJsonPath('data.enrollments_count', 2)
            ->assertJsonPath('data.enrollment', null);
    }

    public function test_course_detail_reports_the_caller_enrollment_when_a_student_token_is_sent(): void
    {
        $student = User::factory()->create();
        $course = Course::factory()->create(['status' => 'published']);
        $enrollment = Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/courses/{$course->slug}")->assertOk()
            ->assertJsonPath('data.enrollment.id', $enrollment->id)
            ->assertJsonPath('data.enrollment.status', 'active')
            ->assertJsonPath('data.enrollment.is_expired', false);

        // Sanctum's RequestGuard caches the resolved user for the app's lifetime and the
        // test kernel never resets it between in-test requests, so a second token would
        // still resolve to $student. Real HTTP requests each get a fresh guard.
        $this->app['auth']->forgetGuards();

        $other = User::factory()->create();
        $this->withToken($other->createToken('test')->plainTextToken)
            ->getJson("/api/v1/courses/{$course->slug}")->assertOk()
            ->assertJsonPath('data.enrollment', null);
    }
}
