<?php

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\Order;
use App\Models\Question;
use App\Models\User;
use Database\Seeders\DemoDashboardSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoDashboardSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_is_repeatable_distributes_demo_data_and_preserves_real_records(): void
    {
        $this->travelTo(now()->setDate(2026, 9, 9)->startOfDay());
        $course = Course::factory()->create();
        Lesson::factory()->count(2)->create(['course_id' => $course->id]);
        $exam = Exam::factory()->create(['course_id' => $course->id]);
        $question = Question::factory()->create(['exam_id' => $exam->id]);
        Answer::factory()->create(['question_id' => $question->id, 'is_correct' => true]);
        foreach (range(1, 20) as $number) {
            $student = User::factory()->create(['email' => sprintf('student%03d@demo.seongon.vn', $number)]);
            $order = Order::factory()->paid()->create(['user_id' => $student->id, 'course_id' => $course->id, 'transaction_ref' => sprintf('DEMO-%03d-001', $number)]);
            Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id, 'order_id' => $order->id]);
        }
        // A matching reference without a known demo user is not sufficient.
        $real = User::factory()->create(['email' => 'real@example.com']);
        $realOrder = Order::factory()->paid()->create(['user_id' => $real->id, 'course_id' => $course->id, 'transaction_ref' => 'DEMO-999-001']);
        $realEnrollment = Enrollment::factory()->create(['user_id' => $real->id, 'course_id' => $course->id, 'order_id' => $realOrder->id]);
        $beforeReal = $realEnrollment->fresh()->getAttributes();
        $beforeOrder = $realOrder->fresh()->getAttributes();
        $revenue = Order::sum('amount');

        $this->seed(DemoDashboardSeeder::class);

        $months = Enrollment::whereKeyNot($realEnrollment->id)->get()->groupBy(fn ($row) => $row->created_at->format('Y-m'))->map->count();
        $this->assertEqualsCanonicalizing(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'], $months->keys()->all());
        $this->assertGreaterThan(1, $months->unique()->count());
        $this->assertSame(8, Certificate::count());
        $this->assertSame(8, Attempt::where('passed', true)->count());
        $this->assertSame(16, LearningProgress::where('is_completed', true)->count());
        $this->assertSame(16, DB::table('learning_progress')->where('is_completed', true)->count());
        foreach (Certificate::with('enrollment.attempts', 'enrollment.learningProgress')->get() as $certificate) {
            $enrollment = $certificate->enrollment;
            $this->assertCount(2, $enrollment->learningProgress);
            $this->assertTrue($enrollment->attempts->first()->passed);
            $this->assertTrue($certificate->issued_at->gte($enrollment->created_at));
            $this->assertTrue($certificate->issued_at->lte(now()));
        }
        $dates = DB::table('enrollments')->pluck('created_at', 'id')->all();
        $certificates = Certificate::all()->toArray();
        $this->seed(DemoDashboardSeeder::class);
        $this->assertSame($dates, DB::table('enrollments')->pluck('created_at', 'id')->all());
        $this->assertSame($certificates, Certificate::all()->toArray());
        $this->assertSame(8, Attempt::count());
        $this->assertSame(21, Enrollment::count());
        $this->assertEquals($revenue, Order::sum('amount'));
        $this->assertSame($beforeReal, $realEnrollment->fresh()->getAttributes());
        $this->assertSame($beforeOrder, $realOrder->fresh()->getAttributes());
    }

    public function test_empty_database_is_a_safe_no_op(): void
    {
        $this->seed(DemoDashboardSeeder::class);
        $this->assertDatabaseCount('enrollments', 0);
        $this->assertDatabaseCount('certificates', 0);
    }
}
