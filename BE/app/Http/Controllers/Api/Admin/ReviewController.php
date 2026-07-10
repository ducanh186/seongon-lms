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
        $query = Review::with(['user', 'course']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return ReviewResource::collection($query->latest()->paginate(15)->withQueryString());
    }

    public function updateStatus(Request $request, Review $review)
    {
        $data = $request->validate([
            'status' => ['required', 'in:visible,hidden'],
        ]);

        $review->update(['status' => $data['status']]);

        return new ReviewResource($review->load('user'));
    }

    public function destroy(Review $review)
    {
        $review->delete();

        return response()->noContent();
    }
}
