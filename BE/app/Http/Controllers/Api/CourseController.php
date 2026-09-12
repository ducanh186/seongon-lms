<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Http\Resources\ReviewResource;
use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $query = Course::query()
            ->published()
            ->with(['category', 'categories'])
            ->withCount([
                'lessons',
                'enrollments',
                'reviews',
            ])
            ->withAvg('reviews', 'rating');

        if ($q = $request->query('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('title', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%");
            });
        }

        if ($category = $request->query('category')) {
            // Filters through the approved ERD course_categories pivot.
            $query->whereHas('categories', function ($c) use ($category) {
                $c->where('categories.slug', $category)->orWhere('categories.id', $category);
            });
        }

        if ($level = $request->query('level')) {
            $query->where('level', $level);
        }

        match ($request->query('price')) {
            'free' => $query->where('price', 0),
            'paid' => $query->where('price', '>', 0),
            default => null,
        };

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->query('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->query('max_price'));
        }

        if (in_array($request->query('price_sort'), ['asc', 'desc'], true) || $request->has('date_sort')) {
            if ($request->query('price_sort') === 'asc') {
                $query->orderBy('price');
            } elseif ($request->query('price_sort') === 'desc') {
                $query->orderByDesc('price');
            }

            $request->query('date_sort') === 'oldest'
                ? $query->orderBy('created_at')
                : $query->orderByDesc('created_at');
        } else {
            match ($request->query('sort')) {
                'price_asc' => $query->orderBy('price'),
                'price_desc' => $query->orderByDesc('price'),
                'oldest' => $query->orderBy('created_at'),
                'popular' => $query->orderByDesc('reviews_count'),
                default => $query->orderByDesc('created_at'),
            };
        }

        return CourseResource::collection($query->paginate(12)->withQueryString());
    }

    public function show(Request $request, string $slug)
    {
        $course = Course::query()
            ->published()
            ->where('slug', $slug)
            ->with(['category', 'categories', 'lessons', 'quiz'])
            ->withCount([
                'lessons',
                'enrollments',
                'reviews',
            ])
            ->withAvg('reviews', 'rating')
            ->firstOrFail();

        // UC-06 exception "Already enrolled": the public detail page needs to know
        // whether the caller owns the course. Optional Sanctum auth, no middleware.
        $user = $request->user('sanctum');
        $enrollment = $user && $user->role === 'student'
            ? Enrollment::query()->where('user_id', $user->id)->where('course_id', $course->id)->first()
            : null;
        $course->setRelation('studentEnrollment', $enrollment);

        return new CourseResource($course);
    }

    public function reviews(string $slug)
    {
        $course = Course::where('slug', $slug)->firstOrFail();

        $reviews = $course->reviews()
            ->with('user')
            ->latest()
            ->paginate(10);

        return ReviewResource::collection($reviews);
    }
}
