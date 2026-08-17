<?php

namespace Tests\Feature\Api;

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NewsManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_list_returns_only_published_posts(): void
    {
        $published = NewsPost::factory()->published()->create(['title' => 'Published post']);
        NewsPost::factory()->draft()->create(['title' => 'Draft post']);
        NewsPost::factory()->published()->create(['title' => 'Future post', 'published_at' => now()->addMinute()]);

        $this->getJson('/api/v1/news')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $published->id)
            ->assertJsonStructure(['data' => [['id', 'title', 'slug', 'category', 'excerpt', 'content', 'thumbnail', 'status', 'published_at', 'created_at', 'updated_at']]]);
    }

    public function test_public_list_filters_published_posts_by_category(): void
    {
        $seoPost = NewsPost::factory()->published()->create(['category' => 'SEO']);
        NewsPost::factory()->published()->create(['category' => 'Quảng cáo']);
        NewsPost::factory()->draft()->create(['category' => 'SEO']);
        NewsPost::factory()->published()->create(['category' => 'SEO', 'published_at' => now()->addMinute()]);

        $this->getJson('/api/v1/news?category=SEO')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $seoPost->id)
            ->assertJsonPath('data.0.category', 'SEO')
            ->assertJsonPath('categories', ['Quảng cáo', 'SEO']);
    }

    public function test_public_draft_detail_returns_not_found(): void
    {
        $draft = NewsPost::factory()->draft()->create();

        $this->getJson("/api/v1/news/{$draft->slug}")->assertNotFound();
    }

    public function test_admin_can_create_show_update_publish_and_delete_news(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $payload = $this->validPayload();

        $create = $this->withToken($token)->postJson('/api/v1/admin/news', $payload);
        $create->assertCreated()
            ->assertJsonPath('data.title', 'News title')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.published_at', null);
        $id = $create->json('data.id');

        $this->withToken($token)->getJson("/api/v1/admin/news/{$id}")
            ->assertOk()
            ->assertJsonPath('data.id', $id);

        $this->withToken($token)->putJson("/api/v1/admin/news/{$id}", array_merge($payload, [
            'title' => 'Published News',
            'status' => 'published',
        ]))->assertOk()
            ->assertJsonPath('data.title', 'Published News')
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.published_at', fn ($publishedAt) => $publishedAt !== null);

        $this->withToken($token)->deleteJson("/api/v1/admin/news/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('news_posts', ['id' => $id]);
    }

    public function test_student_gets_forbidden_for_admin_news_endpoints(): void
    {
        $student = User::factory()->create();
        $token = $student->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/news')->assertForbidden();
    }

    public function test_admin_news_list_filters_by_search_query_and_status(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $draft = NewsPost::factory()->draft()->create([
            'title' => 'SEO draft checklist',
            'category' => 'SEO',
        ]);
        NewsPost::factory()->published()->create([
            'title' => 'SEO published announcement',
            'category' => 'SEO',
        ]);
        NewsPost::factory()->draft()->create([
            'title' => 'Marketing draft checklist',
            'category' => 'Marketing',
        ]);

        $this->withToken($token)->getJson('/api/v1/admin/news?q=SEO&status=draft')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $draft->id)
            ->assertJsonPath('data.0.status', 'draft')
            ->assertJsonPath('meta.total', 1);

        $this->withToken($token)->getJson('/api/v1/admin/news?category=SEO&status=draft')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $draft->id)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_admin_editing_an_already_published_post_preserves_its_original_publish_date(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $publishedAt = now()->subDay()->startOfSecond();
        $newsPost = NewsPost::factory()->published()->create([
            'title' => 'Published before edit',
            'published_at' => $publishedAt,
        ]);

        $this->withToken($token)->putJson("/api/v1/admin/news/{$newsPost->id}", $this->validPayload([
            'title' => 'Published after edit',
            'status' => 'published',
        ]))->assertOk()
            ->assertJsonPath('data.title', 'Published after edit')
            ->assertJsonPath('data.published_at', $publishedAt->toJSON());
    }

    public function test_admin_gets_validation_error_for_invalid_status(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/admin/news', array_merge($this->validPayload(), [
            'status' => 'scheduled',
        ]))->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_duplicate_titles_receive_unique_slugs(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $first = $this->withToken($token)->postJson('/api/v1/admin/news', $this->validPayload(['title' => 'Same title']));
        $second = $this->withToken($token)->postJson('/api/v1/admin/news', $this->validPayload(['title' => 'Same title']));

        $first->assertCreated()->assertJsonPath('data.slug', 'same-title');
        $second->assertCreated()->assertJsonPath('data.slug', 'same-title-1');
    }

    public function test_admin_retries_four_consecutive_unique_slug_collisions_during_create(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $originalDispatcher = NewsPost::getEventDispatcher();
        $collisionsRemaining = 4;

        NewsPost::setEventDispatcher(clone $originalDispatcher);
        NewsPost::creating(function (NewsPost $newsPost) use (&$collisionsRemaining): void {
            if ($collisionsRemaining === 0) {
                return;
            }

            $collisionsRemaining--;
            DB::table('news_posts')->insert([
                'title' => 'Concurrent News',
                'slug' => $newsPost->slug,
                'category' => 'Announcements',
                'excerpt' => 'Inserted at the collision seam.',
                'content' => 'Plain text.',
                'status' => 'draft',
                'published_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        try {
            $response = $this->withToken($token)->postJson('/api/v1/admin/news', $this->validPayload([
                'title' => 'Concurrent News',
            ]));
        } finally {
            NewsPost::setEventDispatcher($originalDispatcher);
        }

        $response->assertCreated()->assertJsonPath('data.slug', 'concurrent-news-4');
        $this->assertDatabaseHas('news_posts', ['slug' => 'concurrent-news']);
        $this->assertDatabaseHas('news_posts', ['slug' => 'concurrent-news-1']);
        $this->assertDatabaseHas('news_posts', ['slug' => 'concurrent-news-2']);
        $this->assertDatabaseHas('news_posts', ['slug' => 'concurrent-news-3']);
        $this->assertDatabaseHas('news_posts', ['slug' => 'concurrent-news-4']);
    }

    /**
     * @return array<string, string>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'News title',
            'category' => 'Announcements',
            'excerpt' => 'A short news excerpt.',
            'content' => 'Plain text news content.',
            'thumbnail' => 'https://example.test/news.png',
            'status' => 'draft',
        ], $overrides);
    }
}
