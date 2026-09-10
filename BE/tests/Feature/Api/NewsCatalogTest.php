<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
