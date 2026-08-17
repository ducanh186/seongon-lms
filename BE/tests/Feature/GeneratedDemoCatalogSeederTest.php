<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\User;
use Database\Seeders\CompletedCourseDemoSeeder;
use Database\Seeders\GeneratedDemoCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeneratedDemoCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_uses_the_prototype_course_thumbnail_set_instead_of_random_images(): void
    {
        $this->seed(GeneratedDemoCatalogSeeder::class);

        $courses = Course::query()->orderBy('slug')->get(['slug', 'thumbnail']);

        $this->assertCount(100, $courses);
        $this->assertFalse($courses->contains(
            fn (Course $course): bool => str_contains((string) $course->thumbnail, 'picsum.photos'),
        ));
        $this->assertSame('/generated-images/course-ai-search.webp', $courses->firstWhere('slug', 'seo-ai-max-01')?->thumbnail);
        $this->assertSame('/generated-images/course-ads.webp', $courses->firstWhere('slug', 'google-ads-01')?->thumbnail);
        $this->assertSame('/generated-images/course-content.webp', $courses->firstWhere('slug', 'content-seo-01')?->thumbnail);
        $this->assertFalse($courses->contains(
            fn (Course $course): bool => str_starts_with((string) $course->thumbnail, '/course-images/'),
        ));
        $this->assertGreaterThanOrEqual(5, $courses->pluck('thumbnail')->unique()->count());

        $factoryCourse = Course::factory()->create();

        $this->assertMatchesRegularExpression(
            '#^/generated-images/course-(seo|ads|content|ai-search|analytics)\.webp$#',
            (string) $factoryCourse->thumbnail,
        );
    }

    public function test_it_seeds_one_hundred_unique_editorial_course_titles_without_placeholder_copy(): void
    {
        $this->seed(GeneratedDemoCatalogSeeder::class);

        $titles = Course::query()->orderBy('slug')->pluck('title');

        $this->assertCount(100, $titles);
        $this->assertCount(100, $titles->unique());
        $this->assertContains('SEO Foundation: Xây nền tảng tăng trưởng bền vững', $titles);
        $this->assertContains('Google Ads Search từ cơ bản đến tối ưu', $titles);
        $this->assertContains('Content Marketing Foundation', $titles);
        $this->assertFalse($titles->contains(fn (string $title): bool => preg_match('/\b(?:Qui|Nobis|Eum|Facilis|Distinctio|Optio|Harum|Iste|Expedita)\b/i', $title) === 1));
        $this->assertFalse($titles->contains(fn (string $title): bool => preg_match('/\bDemo\b/i', $title) === 1));
        $this->assertFalse($titles->contains(fn (string $title): bool => preg_match('/\b\d{2}\s*:/', $title) === 1));
    }

    public function test_the_completed_fixture_keeps_a_distinct_editorial_identity_in_the_full_catalog(): void
    {
        $this->seed(GeneratedDemoCatalogSeeder::class);
        $this->seed(CompletedCourseDemoSeeder::class);

        $this->assertSame(101, Course::query()->count());
        $this->assertSame(101, Course::query()->distinct()->count('title'));
    }

    public function test_it_seeds_realistic_unique_vietnamese_student_names(): void
    {
        $this->seed(GeneratedDemoCatalogSeeder::class);

        $students = User::query()
            ->where('email', 'like', 'student%@demo.seongon.vn')
            ->pluck('name');

        $this->assertCount(100, $students);
        $this->assertCount(100, $students->unique());
        $this->assertContains('Nguyễn Văn An', $students);
        $this->assertFalse($students->contains(
            fn (string $name): bool => preg_match('/(?:Học viên|Demo|SEONGON|\d{2,})/ui', $name) === 1,
        ));
    }

    public function test_it_uses_topic_relevant_youtube_videos_instead_of_placeholder_animation(): void
    {
        $this->seed(GeneratedDemoCatalogSeeder::class);

        $videos = Lesson::query()->pluck('video_url');
        $socialCourse = Course::query()->where('title', 'Social Content cho Facebook và Instagram')->firstOrFail();

        $this->assertNotEmpty($videos);
        $this->assertFalse($videos->contains(
            fn (string $url): bool => str_contains($url, 'aqz-KE-bpKQ'),
        ));
        $this->assertSame(
            ['https://www.youtube.com/embed/tJCEVBwvrqY'],
            $socialCourse->lessons()->pluck('video_url')->unique()->values()->all(),
        );
    }
}
