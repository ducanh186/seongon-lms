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
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
        ]);

        $query = Review::with(['user', 'course']);

        if ($courseId = $filters['course_id'] ?? null) {
            $query->where('course_id', $courseId);
        }

        return ReviewResource::collection($query->latest()->paginate(15)->withQueryString());
    }

    public function destroy(Review $review)
    {
        $review->delete();

        return response()->noContent();
    }
}
