<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthAndCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_catalog_only_returns_published_courses_and_applies_filters(): void
    {
        $seo = Category::factory()->create(['name' => 'SEO', 'slug' => 'seo']);
        $content = Category::factory()->create(['name' => 'Content', 'slug' => 'content']);
        $matching = Course::factory()->create([
            'category_id' => $seo->id,
            'title' => 'SEO Technical Foundation',
            'slug' => 'seo-technical-foundation',
            'price' => 299000,
        ]);
        Course::factory()->create(['category_id' => $content->id, 'price' => 799000]);
        Course::factory()->draft()->create(['category_id' => $seo->id]);

        $response = $this->getJson('/api/v1/courses?q=technical&category=seo&max_price=300000');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id)
            ->assertJsonPath('data.0.category.slug', 'seo');

        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'seo', 'courses_count' => 1]);
    }

    public function test_guest_catalog_filters_price_level_and_sorts_paid_courses_descending(): void
    {
        $seo = Category::factory()->create(['name' => 'SEO', 'slug' => 'seo']);
        Course::factory()->create(['category_id' => $seo->id, 'price' => 0, 'level' => 'beginner']);
        $middle = Course::factory()->create(['category_id' => $seo->id, 'price' => 100000, 'level' => 'advanced']);
        $highest = Course::factory()->create(['category_id' => $seo->id, 'price' => 300000, 'level' => 'advanced']);
        Course::factory()->draft()->create(['category_id' => $seo->id, 'price' => 900000, 'level' => 'advanced']);

        $response = $this->getJson('/api/v1/courses?category=seo&level=advanced&price=paid&sort=price_desc');

        $response->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.id', $highest->id)
            ->assertJsonPath('data.0.price', '300000.00')
            ->assertJsonPath('data.1.id', $middle->id)
            ->assertJsonPath('data.1.price', '100000.00');
    }

    public function test_guest_catalog_supports_free_courses_and_stable_pagination(): void
    {
        Course::factory()->count(13)->create(['price' => 0]);
        Course::factory()->create(['price' => 200000]);

        $this->getJson('/api/v1/courses?price=free&page=2')
            ->assertOk()
            ->assertJsonPath('meta.total', 13)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonCount(1, 'data');
    }

    public function test_guest_can_register_then_login_and_a_locked_account_is_rejected(): void
    {
        $registration = $this->postJson('/api/v1/auth/register', [
            'name' => 'Nguyen Van A',
            'email' => 'student@example.test',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $registration->assertCreated()
            ->assertJsonPath('user.role', 'student')
            ->assertJsonStructure(['user' => ['id', 'email'], 'token']);
        $this->assertDatabaseHas('users', ['email' => 'student@example.test', 'status' => 'active']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'student@example.test',
            'password' => 'SecurePass123!',
        ])->assertOk()->assertJsonStructure(['user', 'token']);

        $locked = User::factory()->locked()->create(['password' => 'SecurePass123!']);

        $this->postJson('/api/v1/auth/login', [
            'email' => $locked->email,
            'password' => 'SecurePass123!',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_authenticated_user_can_manage_profile_password_and_current_token(): void
    {
        $user = User::factory()->create(['password' => 'OldPass123!']);
        $createdToken = $user->createToken('test');
        $token = $createdToken->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => 'Updated Student',
            'phone' => '0900000000',
            'avatar' => 'https://example.test/avatar.png',
        ])->assertOk()->assertJsonPath('data.name', 'Updated Student');

        $this->withToken($token)->putJson('/api/v1/auth/password', [
            'current_password' => 'OldPass123!',
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ])->assertNoContent();

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $createdToken->accessToken->id]);
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'OldPass123!'])
            ->assertUnprocessable();
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'NewPass123!'])
            ->assertOk()->assertJsonStructure(['user', 'token']);
    }
}
