<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\DemoPopularCoursesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoPopularCoursesSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_additive_sync_breaks_uniform_demo_ranking_without_replacing_existing_data(): void
    {
        $students = collect(range(1, 100))->map(fn ($number) => User::factory()->create([
            'email' => sprintf('student%03d@demo.seongon.vn', $number),
        ]));
        foreach (['seo-ai-max-01', 'google-ads-01', 'content-seo-01', 'seo-ai-max-02', 'google-ads-02'] as $slug) {
            $course = Course::factory()->create(['slug' => $slug, 'status' => 'published']);
            foreach ($students->take(9) as $student) {
                Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);
            }
        }
        $real = Enrollment::factory()->create();
        $before = DB::table('enrollments')->orderBy('id')->get()->toArray();

        $this->seed(DemoPopularCoursesSeeder::class);

        $ranking = Course::withCount('enrollments')->orderByDesc('enrollments_count')->limit(5)->pluck('enrollments_count');
        $this->assertGreaterThanOrEqual(60, $ranking->first());
        $this->assertGreaterThanOrEqual(4, $ranking->unique()->count());
        $this->assertLessThan(350, Enrollment::count());
        $this->assertEquals($before, DB::table('enrollments')->where('id', '<=', $real->id)->orderBy('id')->get()->toArray());
        $this->assertSame(1, $real->user->enrollments()->count());
        $this->assertSame(0, DB::table('enrollments')->selectRaw('user_id, course_id, count(*) as total')->groupBy('user_id', 'course_id')->havingRaw('count(*) > 1')->get()->count());
        foreach (Order::all() as $order) {
            $this->assertSame('paid', $order->status);
            $this->assertSame($order->user_id, $order->enrollment->user_id);
            $this->assertSame($order->course_id, $order->enrollment->course_id);
            $this->assertEquals($order->course->price, $order->amount);
        }
        $allEnrollments = DB::table('enrollments')->orderBy('id')->get()->toArray();
        $orders = DB::table('orders')->orderBy('id')->get()->toArray();
        $this->seed(DemoPopularCoursesSeeder::class);
        $this->assertEquals($allEnrollments, DB::table('enrollments')->orderBy('id')->get()->toArray());
        $this->assertEquals($orders, DB::table('orders')->orderBy('id')->get()->toArray());
    }

    public function test_sync_does_not_create_missing_users_or_courses(): void
    {
        $this->seed(DemoPopularCoursesSeeder::class);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('courses', 0);
        $this->assertDatabaseCount('enrollments', 0);
        $this->assertDatabaseCount('orders', 0);
    }
}
