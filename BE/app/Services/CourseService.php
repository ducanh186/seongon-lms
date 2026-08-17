<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CourseService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateCategoryAssignments(array $filters = []): LengthAwarePaginator
    {
        return CourseCategory::query()
            ->with(['course', 'category'])
            ->when(
                $filters['course_id'] ?? null,
                fn (Builder $query, int $courseId) => $query->where('course_id', $courseId),
            )
            ->when(
                $filters['category_id'] ?? null,
                fn (Builder $query, int $categoryId) => $query->where('category_id', $categoryId),
            )
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateForAdmin(array $filters = []): LengthAwarePaginator
    {
        $query = Course::query()
            ->with(['category', 'categories'])
            ->withCount(['lessons', 'questions', 'enrollments'])
            ->withExists('exam')
            ->withAvg('reviews', 'rating');

        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($search = $filters['q'] ?? null) {
            $query->where('title', 'like', "%{$search}%");
        }

        return $query->latest()->paginate(15)->withQueryString();
    }

    public function forAdmin(Course $course): Course
    {
        return $course
            ->load(['category', 'categories', 'lessons', 'quiz.questions.answers'])
            ->loadCount(['lessons', 'questions', 'enrollments', 'reviews'])
            ->loadExists('exam')
            ->loadAvg('reviews', 'rating');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Course
    {
        return DB::transaction(function () use ($data): Course {
            $categoryIds = $this->categoryIds($data);
            $attributes = $this->courseAttributes($data);
            $attributes['category_id'] = $categoryIds[0];
            $attributes['slug'] = $this->uniqueSlug($attributes['title']);

            $course = Course::query()->create($attributes);
            $course->categories()->sync($categoryIds);

            return $this->forAdmin($course);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Course $course, array $data): Course
    {
        return DB::transaction(function () use ($course, $data): Course {
            $categoryIds = $this->categoryIds($data);

            $course->update($this->courseAttributes($data));
            $course->categories()->sync($categoryIds);

            // Compatibility only: new application reads/writes the pivot. Keep the
            // first selected category in the legacy column for older deployments.
            $course->forceFill(['category_id' => $categoryIds[0]])->saveQuietly();

            return $this->forAdmin($course->fresh());
        });
    }

    public function setStatus(Course $course, string $status): Course
    {
        $course->update(['status' => $status]);

        return $this->forAdmin($course->fresh());
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<int>
     */
    private function categoryIds(array $data): array
    {
        $ids = $data['category_ids'] ?? [$data['category_id']];

        return collect($ids)->map(fn ($id): int => (int) $id)->unique()->values()->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function courseAttributes(array $data): array
    {
        unset($data['category_ids'], $data['category_id']);

        return $data;
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 1;

        while (Course::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix++;
        }

        return $slug;
    }
}
