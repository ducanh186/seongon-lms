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

    public function test_student_demo_courses_use_distinct_relevant_youtube_lessons(): void
    {
        $this->artisan('app:replace-demo-catalog', ['--force' => true])->assertSuccessful();

        $expectedVideos = [
            'seo-ai-max-01' => ['KjK5-L-wDVg', 'vxoMlEMtwuw', 'TPtCjy4n4cU', '_s2h7X-c2jE'],
            'seo-ai-max-14' => ['EqMjWU7vF2o', '_oU8lclN114', 'n-kxOhnSH-Q', 'HPL0O7Oe3j0'],
            'seo-ai-max-27' => ['RFlpwKQ0bEs', 'aLWQqlpwHK8', 'wTwnFcWUM3k', 'G_9-AkZch4k'],
            'content-seo-09' => ['uG1TG6z8Mz4', '40U1WlmnDFU', '5LF6SwB5jZ0', 'jJPS4M72FLg'],
        ];

        foreach ($expectedVideos as $courseSlug => $videoIds) {
            $actualUrls = Course::query()
                ->where('slug', $courseSlug)
                ->firstOrFail()
                ->lessons()
                ->orderBy('position')
                ->pluck('video_url')
                ->all();

            $expectedUrls = array_map(
                fn (string $videoId): string => "https://www.youtube.com/embed/{$videoId}",
                $videoIds,
            );

            $this->assertSame($expectedUrls, $actualUrls, $courseSlug);
            $this->assertCount(4, array_unique($actualUrls), $courseSlug);
        }
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
