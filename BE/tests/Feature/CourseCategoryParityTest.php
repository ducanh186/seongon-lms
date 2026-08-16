<?php

use App\Models\Category;
use App\Models\Course;
use Illuminate\Support\Facades\DB;

/**
 * P0 step D2 — expand phase for Courses -> Course_categories -> Categories.
 *
 * courses.category_id is still present and must stay in exact parity with the
 * approved ERD pivot until the contract phase drops it.
 */
function pivotCategoryIds(Course $course): array
{
    return DB::table('course_categories')
        ->where('course_id', $course->id)
        ->orderBy('category_id')
        ->pluck('category_id')
        ->all();
}

it('writes one pivot row when a course is created', function () {
    $category = Category::factory()->create();
    $course = Course::factory()->create(['category_id' => $category->id]);

    expect(pivotCategoryIds($course))->toBe([$category->id]);
});

it('re-syncs the pivot when category_id changes', function () {
    $first = Category::factory()->create();
    $second = Category::factory()->create();
    $course = Course::factory()->create(['category_id' => $first->id]);

    $course->update(['category_id' => $second->id]);

    expect(pivotCategoryIds($course))->toBe([$second->id]);
});

it('leaves extra pivot categories alone when other fields change', function () {
    $primary = Category::factory()->create();
    $extra = Category::factory()->create();
    $course = Course::factory()->create(['category_id' => $primary->id]);

    $course->categories()->attach($extra->id);
    $course->update(['title' => 'Tiêu đề mới']);

    expect(pivotCategoryIds($course))->toBe(collect([$primary->id, $extra->id])->sort()->values()->all());
});

it('keeps every course in parity between the legacy column and the pivot', function () {
    Course::factory()->count(5)->create();
    Course::factory()->draft()->count(3)->create();

    $mismatches = DB::table('courses')
        ->whereNotNull('category_id')
        ->whereNotExists(fn ($q) => $q->select(DB::raw(1))
            ->from('course_categories')
            ->whereColumn('course_categories.course_id', 'courses.id')
            ->whereColumn('course_categories.category_id', 'courses.category_id'))
        ->count();

    expect($mismatches)->toBe(0);
});

it('filters the public catalog through the pivot with the same result as the legacy column', function () {
    $seo = Category::factory()->create(['slug' => 'seo']);
    $ads = Category::factory()->create(['slug' => 'ads']);
    Course::factory()->count(2)->create(['category_id' => $seo->id, 'status' => 'published']);
    Course::factory()->create(['category_id' => $ads->id, 'status' => 'published']);
    Course::factory()->draft()->create(['category_id' => $seo->id]);

    $viaLegacy = Course::query()->published()->where('category_id', $seo->id)->count();
    $viaPivot = $this->getJson('/api/v1/courses?category=seo')->assertOk()->json('meta.total');

    expect($viaPivot)->toBe(2)->and($viaPivot)->toBe($viaLegacy);
});

it('counts courses per category through the pivot', function () {
    $category = Category::factory()->create();
    Course::factory()->count(4)->create(['category_id' => $category->id, 'status' => 'published']);
    Course::factory()->draft()->create(['category_id' => $category->id]);

    $viaLegacy = DB::table('courses')->where('category_id', $category->id)->count();

    expect($category->courses()->count())->toBe($viaLegacy)->toBe(5);
});
