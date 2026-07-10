<?php

use App\Models\Category;
use App\Models\Course;
use App\Models\Review;

it('lists only published courses', function () {
    Course::factory()->count(3)->create(['status' => 'published']);
    Course::factory()->count(2)->draft()->create();

    $this->getJson('/api/v1/courses')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('filters courses by category slug', function () {
    $category = Category::factory()->create(['slug' => 'seo']);
    Course::factory()->count(2)->create(['category_id' => $category->id, 'status' => 'published']);
    Course::factory()->create(['status' => 'published']);

    $this->getJson('/api/v1/courses?category=seo')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('shows a course by slug', function () {
    Course::factory()->create(['status' => 'published', 'slug' => 'khoa-hoc-abc']);

    $this->getJson('/api/v1/courses/khoa-hoc-abc')
        ->assertOk()
        ->assertJsonPath('data.slug', 'khoa-hoc-abc');
});

it('lists only visible reviews of a course', function () {
    $course = Course::factory()->create(['status' => 'published', 'slug' => 'c1']);
    Review::factory()->count(2)->create(['course_id' => $course->id, 'status' => 'visible']);
    Review::factory()->create(['course_id' => $course->id, 'status' => 'hidden']);

    $this->getJson('/api/v1/courses/c1/reviews')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});
