<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\NewsPost;
use App\Models\User;
use Database\Seeders\DemoNewsSeeder;
use Database\Seeders\DemoPresentationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoNewsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_eight_attributed_learning_articles_with_local_thumbnails_idempotently(): void
    {
        $this->seed(DemoNewsSeeder::class);
        $this->seed(DemoNewsSeeder::class);

        $posts = NewsPost::query()->orderBy('slug')->get();

        $this->assertCount(8, $posts);
        $this->assertTrue($posts->every(fn (NewsPost $post): bool => $post->status === 'published'));
        $this->assertTrue($posts->every(fn (NewsPost $post): bool => str_starts_with((string) $post->thumbnail, '/images/news/')));
        $this->assertTrue($posts->every(fn (NewsPost $post): bool => str_contains($post->content, 'Nguồn tham khảo: https://seongon.com/')));
        $this->assertGreaterThanOrEqual(3, $posts->pluck('category')->unique()->count());
    }

    public function test_the_presentation_seeder_updates_demo_content_without_replacing_unrelated_courses(): void
    {
        $student = User::factory()->create([
            'name' => 'Học viên Demo 001',
            'email' => 'student001@demo.seongon.vn',
        ]);
        $course = Course::factory()->create([
            'slug' => 'content-seo-11',
            'title' => 'Social Content cho Facebook và Instagram',
        ]);
        $unrelatedCourse = Course::factory()->create(['slug' => 'manual-course']);
        Lesson::factory()->create([
            'course_id' => $course->id,
            'sort_order' => 1,
            'video_url' => 'https://www.youtube.com/embed/aqz-KE-bpKQ',
        ]);

        $this->seed(DemoPresentationSeeder::class);

        $this->assertSame('Nguyễn Văn An', $student->refresh()->name);
        $this->assertSame('https://www.youtube.com/embed/tJCEVBwvrqY', $course->lessons()->firstOrFail()->video_url);
        $this->assertModelExists($unrelatedCourse);
        $this->assertDatabaseCount('news_posts', 8);
    }
}
