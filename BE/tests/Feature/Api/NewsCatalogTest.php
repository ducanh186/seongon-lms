<?php

namespace Tests\Feature\Api;

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NewsCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_catalogs_and_duplicate_names_are_rejected(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $id = $this->postJson('/api/v1/admin/catalogs', ['name' => 'Industry news', 'description' => 'Updates'])
            ->assertCreated()->json('data.id');
        $this->postJson('/api/v1/admin/catalogs', ['name' => 'Industry news'])->assertUnprocessable();
        $this->putJson("/api/v1/admin/catalogs/{$id}", ['name' => 'Academy news', 'description' => 'New description'])->assertOk();
        $this->getJson('/api/v1/admin/catalogs')->assertOk()->assertJsonPath('data.0.name', 'Academy news');
        $this->assertDatabaseHas('catalogs', ['id' => $id, 'description' => 'New description']);
        $this->deleteJson("/api/v1/admin/catalogs/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('catalogs', ['id' => $id]);
    }

    public function test_catalog_management_requires_admin(): void
    {
        $this->getJson('/api/v1/admin/catalogs')->assertUnauthorized();
        $this->actingAs(User::factory()->create());
        $this->getJson('/api/v1/admin/catalogs')->assertForbidden();
        $this->postJson('/api/v1/admin/catalogs', ['name' => 'Not allowed'])->assertForbidden();
    }

    public function test_article_categories_are_managed_and_renames_update_existing_articles(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $post = NewsPost::factory()->published()->create(['category' => 'SEO & AI']);

        $catalog = $this->getJson('/api/v1/admin/catalogs')->assertOk()
            ->assertJsonPath('data.0.name', 'SEO & AI')->json('data.0');

        $this->putJson("/api/v1/admin/catalogs/{$catalog['id']}", [
            'name' => 'SEO cập nhật', 'description' => 'Tin SEO',
        ])->assertOk();

        $this->assertDatabaseHas('news_posts', ['id' => $post->id, 'category' => 'SEO cập nhật']);
        $this->getJson('/api/v1/news?category=SEO%20c%E1%BA%ADp%20nh%E1%BA%ADt')
            ->assertOk()->assertJsonCount(1, 'data');
        $this->deleteJson("/api/v1/admin/catalogs/{$catalog['id']}")
            ->assertStatus(422);
    }

    public function test_backfill_preserves_categories_from_articles_created_before_catalogs_existed(): void
    {
        DB::table('news_posts')->insert([
            'title' => 'Legacy article', 'slug' => 'legacy-article', 'category' => 'Legacy SEO',
            'excerpt' => 'Summary', 'content' => 'Body', 'status' => 'draft',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->assertDatabaseMissing('catalogs', ['name' => 'Legacy SEO']);

        $migration = require database_path('migrations/2026_09_12_000001_backfill_news_catalogs.php');
        $migration->up();
        $migration->up();

        $this->assertDatabaseCount('catalogs', 1);
        $this->assertDatabaseHas('catalogs', ['name' => 'Legacy SEO']);
    }
}
