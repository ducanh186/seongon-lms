<?php

namespace Tests\Feature\Console;

use App\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
