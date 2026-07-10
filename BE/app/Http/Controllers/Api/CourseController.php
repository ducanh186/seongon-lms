<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Http\Resources\ReviewResource;
use App\Models\Course;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $query = Course::query()
            ->published()
            ->with('category')
            ->withCount('lessons')
            ->withCount('reviews')
            ->withAvg('reviews', 'rating');

        if ($q = $request->query('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('title', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->whereHas('category', function ($c) use ($category) {
                $c->where('slug', $category)->orWhere('id', $category);
            });
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->query('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->query('max_price'));
        }

        match ($request->query('sort')) {
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'popular' => $query->orderByDesc('reviews_count'),
            default => $query->orderByDesc('created_at'),
        };

        return CourseResource::collection($query->paginate(12)->withQueryString());
    }

    public function show(string $slug)
    {
        $course = Course::query()
            ->published()
            ->where('slug', $slug)
            ->with(['category', 'lessons', 'quiz'])
            ->withCount(['lessons', 'reviews'])
            ->withAvg('reviews', 'rating')
            ->firstOrFail();

        return new CourseResource($course);
    }

    public function reviews(string $slug)
    {
        $course = Course::where('slug', $slug)->firstOrFail();

        $reviews = $course->reviews()
            ->where('status', 'visible')
            ->with('user')
            ->latest()
            ->paginate(10);

        return ReviewResource::collection($reviews);
    }
}
