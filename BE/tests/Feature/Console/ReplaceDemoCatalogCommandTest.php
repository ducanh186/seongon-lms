<?php

namespace Tests\Feature\Console;

use App\Models\Category;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReplaceDemoCatalogCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_refuses_to_replace_catalog_without_force(): void
    {
        $course = Course::factory()->create(['slug' => 'legacy-course']);

        $this->artisan('app:replace-demo-catalog')
            ->expectsOutput('Catalog chưa được thay đổi. Hãy chạy lại với --force.')
            ->assertFailed();

        $this->assertModelExists($course);
    }

    public function test_it_replaces_catalog_and_preserves_existing_students(): void
    {
        $existingStudents = User::factory()->count(2)->create();
        $legacyCourse = Course::factory()->create(['slug' => 'legacy-course']);
        Enrollment::factory()->create([
            'user_id' => $existingStudents->first()->id,
            'course_id' => $legacyCourse->id,
        ]);

        $this->artisan('app:replace-demo-catalog', ['--force' => true])
            ->expectsOutput('Đã thay catalog demo thành công.')
            ->assertSuccessful();

        $this->assertDatabaseMissing('courses', ['slug' => 'legacy-course']);
        $this->assertDatabaseCount('categories', 3);
        $this->assertDatabaseCount('courses', 100);
        $this->assertSame(100, Course::query()->distinct()->count('slug'));
        $this->assertSame(34, Category::where('slug', 'seo-ai-max')->firstOrFail()->courses()->count());
        $this->assertSame(33, Category::where('slug', 'google-ads')->firstOrFail()->courses()->count());
        $this->assertSame(33, Category::where('slug', 'content-seo')->firstOrFail()->courses()->count());
        $this->assertSame(100, User::where('email', 'like', 'student%@demo.seongon.vn')->count());

        $existingStudents->each(
            fn (User $student) => $this->assertDatabaseHas('users', ['id' => $student->id]),
        );

        $counts = Enrollment::query()
            ->select('user_id', DB::raw('count(*) as aggregate'))
            ->groupBy('user_id')
            ->pluck('aggregate');

        $this->assertCount(102, $counts);
        $this->assertGreaterThanOrEqual(3, $counts->min());
        $this->assertLessThanOrEqual(8, $counts->max());
    }

    public function test_replacement_is_idempotent_for_demo_users_and_catalog(): void
    {
        User::factory()->count(2)->create();

        $this->artisan('app:replace-demo-catalog', ['--force' => true])->assertSuccessful();
        $this->artisan('app:replace-demo-catalog', ['--force' => true])->assertSuccessful();

        $this->assertDatabaseCount('courses', 100);
        $this->assertSame(100, User::where('email', 'like', 'student%@demo.seongon.vn')->count());
    }
}
