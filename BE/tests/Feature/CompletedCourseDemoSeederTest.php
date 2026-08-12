<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LessonProgress;
use App\Models\QuizAttempt;
use App\Models\User;
use Database\Seeders\CompletedCourseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CompletedCourseDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_one_completed_course_with_a_downloadable_certificate_idempotently(): void
    {
        $existingCourse = Course::factory()->create(['title' => 'Existing Course']);
        $existingDemoStudent = User::factory()->admin()->locked()->create([
            'email' => 'student@seongon.vn',
        ]);

        $this->seed(CompletedCourseDemoSeeder::class);
        $this->seed(CompletedCourseDemoSeeder::class);

        $student = User::query()->where('email', 'student@seongon.vn')->firstOrFail();
        $course = Course::query()->where('slug', 'completed-demo-course')->firstOrFail();
        $enrollment = Enrollment::query()
            ->where('user_id', $student->id)
            ->where('course_id', $course->id)
            ->firstOrFail();
        $attempt = QuizAttempt::query()->where('enrollment_id', $enrollment->id)->firstOrFail();

        $this->assertDatabaseHas('courses', ['id' => $existingCourse->id]);
        $this->assertSame($existingDemoStudent->id, $student->id);
        $this->assertSame('student', $student->role);
        $this->assertSame('active', $student->status);
        $this->assertTrue(Hash::check('password', $student->password));
        $this->assertSame('published', $course->status);
        $this->assertSame('Thực hành xây dựng kế hoạch SEO 90 ngày', $course->title);
        $this->assertSame('SEO thực chiến', $course->category->name);
        $this->assertSame('Nguyễn Minh Anh', $course->instructor_name);
        $this->assertSame(
            ['Xác định mục tiêu SEO và KPI', 'Xây dựng kế hoạch SEO 90 ngày'],
            $course->lessons()->orderBy('position')->pluck('title')->all(),
        );
        $this->assertSame('Đánh giá cuối khóa SEO Foundation', $course->quiz->title);
        $visibleCopy = implode(' ', [
            $course->category->name,
            $course->category->description,
            $course->title,
            $course->description,
            $course->instructor_name,
            $course->instructor_bio,
            ...$course->lessons()->pluck('title')->all(),
            $course->quiz->title,
        ]);
        $this->assertDoesNotMatchRegularExpression('/\bDemo\b/i', $visibleCopy);
        $this->assertSame('/generated-images/course-analytics.webp', $course->thumbnail);
        $this->assertDatabaseCount('enrollments', 1);
        $this->assertSame('active', $enrollment->status);
        $this->assertSame(2, $course->lessons()->count());
        $this->assertSame(2, LessonProgress::query()->where('enrollment_id', $enrollment->id)->count());
        $this->assertSame(2, LessonProgress::query()
            ->where('enrollment_id', $enrollment->id)
            ->where('is_completed', true)
            ->count());
        $this->assertSame(1, $course->quiz()->count());
        $this->assertSame(1, $course->quiz->questions()->count());
        $this->assertSame(2, $course->quiz->questions->first()->options()->count());
        $this->assertSame(1, $course->quiz->questions->first()->options()->where('is_correct', true)->count());
        $this->assertSame(1, $course->quiz->questions->first()->options()->where('is_correct', false)->count());
        $this->assertSame(1, QuizAttempt::query()->where('enrollment_id', $enrollment->id)->count());
        $this->assertSame(100, $attempt->score);
        $this->assertTrue($attempt->passed);
        $this->assertSame(1, $attempt->answers()->count());
        $this->assertSame(1, Certificate::query()->where('enrollment_id', $enrollment->id)->count());

        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->get("/api/v1/my/courses/{$course->id}/certificate")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('content-disposition');
    }
}
