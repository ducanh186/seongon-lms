<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Database\Seeders\QuickDemoCourseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class QuickDemoCourseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_adds_only_a_three_question_demo_course_without_changing_existing_users_or_courses(): void
    {
        $user = User::factory()->create([
            'email' => 'student@seongon.vn',
            'password' => Hash::make('keep-existing-password'),
        ]);
        $existingPassword = $user->password;
        $existingCourse = Course::factory()->create(['price' => 0]);

        $this->seed(QuickDemoCourseSeeder::class);
        $this->seed(QuickDemoCourseSeeder::class);

        $demo = Course::query()->where('slug', Course::QUICK_DEMO_SLUG)->firstOrFail();
        $this->assertSame('published', $demo->status);
        $this->assertSame(2, $demo->lessons()->count());
        $this->assertSame(3, $demo->quiz->questions()->count());
        $this->assertSame(3, $demo->quiz->questions()->whereHas('answers', fn ($query) => $query->where('is_correct', true))->count());
        $this->assertEquals(0, $existingCourse->fresh()->price);
        $this->assertSame($existingPassword, $user->fresh()->password);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('courses', 2);
        $this->assertDatabaseCount('enrollments', 0);
    }
}
