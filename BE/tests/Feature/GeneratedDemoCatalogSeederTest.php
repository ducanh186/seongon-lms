<?php

namespace Tests\Feature;

use App\Models\Course;
use Database\Seeders\GeneratedDemoCatalogSeeder;
use Database\Seeders\CompletedCourseDemoSeeder;
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
}
