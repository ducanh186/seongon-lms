<?php

use App\Models\Course;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('lets an admin create a category', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson('/api/v1/admin/categories', ['name' => 'Data'])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'data');
});

it('forbids a student from admin endpoints', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/admin/categories', ['name' => 'X'])->assertStatus(403);
    $this->getJson('/api/v1/admin/dashboard/stats')->assertStatus(403);
});

it('returns dashboard stats for an admin', function () {
    Course::factory()->count(3)->create(['status' => 'published']);
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/api/v1/admin/dashboard/stats')
        ->assertOk()
        ->assertJsonStructure([
            'students', 'courses', 'published_courses',
            'enrollments', 'certificates', 'completion_rate', 'revenue',
        ]);
});

it('lets an admin add a lesson to a course', function () {
    $course = Course::factory()->create();
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->postJson("/api/v1/admin/courses/{$course->id}/lessons", [
        'title' => 'Bài mới',
        'video_url' => 'https://youtu.be/abc',
    ])
        ->assertCreated()
        ->assertJsonPath('data.position', 1);
});
