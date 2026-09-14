<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'per_page' => ['nullable', 'integer', 'in:15,25,50'],
        ]);

        $query = Review::with(['user', 'course']);

        if ($courseId = $filters['course_id'] ?? null) {
            $query->where('course_id', $courseId);
        }

        if ($search = $filters['q'] ?? null) {
            $query->where(function ($reviewQuery) use ($search): void {
                $reviewQuery->whereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('course', fn ($courseQuery) => $courseQuery->where('title', 'like', "%{$search}%"));
            });
        }

        if ($rating = $filters['rating'] ?? null) {
            $query->where('rating', $rating);
        }

        return ReviewResource::collection($query->latest()->paginate((int) ($filters['per_page'] ?? 15))->withQueryString());
    }

    public function destroy(Review $review)
    {
        $review->delete();

        return response()->noContent();
    }
}
