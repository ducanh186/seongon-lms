<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request, Course $course)
    {
        $user = $request->user();

        $hasEnrollment = Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->exists();

        abort_unless($hasEnrollment, 403, 'Bạn cần đăng ký khóa học để đánh giá.');

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $review = Review::updateOrCreate(
            ['user_id' => $user->id, 'course_id' => $course->id],
            ['rating' => $data['rating'], 'comment' => $data['comment'] ?? null, 'status' => 'visible'],
        );

        return (new ReviewResource($review->load('user')))
            ->response()
            ->setStatusCode(201);
    }
}
