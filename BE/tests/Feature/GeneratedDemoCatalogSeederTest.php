<?php

namespace Tests\Feature;

use App\Models\Course;
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
        $this->assertSame('/course-images/course-thumb-1.svg', $courses->firstWhere('slug', 'seo-ai-max-01')?->thumbnail);
        $this->assertSame('/course-images/course-thumb-2.svg', $courses->firstWhere('slug', 'google-ads-01')?->thumbnail);
        $this->assertSame('/course-images/course-thumb-3.svg', $courses->firstWhere('slug', 'content-seo-01')?->thumbnail);
        $this->assertGreaterThanOrEqual(6, $courses->pluck('thumbnail')->unique()->count());

        $factoryCourse = Course::factory()->create();

        $this->assertMatchesRegularExpression(
            '#^/course-images/course-thumb-[1-6]\.svg$#',
            (string) $factoryCourse->thumbnail,
        );
    }
}
