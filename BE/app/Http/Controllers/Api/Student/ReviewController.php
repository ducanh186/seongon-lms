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
    /**
     * UC-12 exception flow "Existing review": the client needs the caller's own
     * review to render an edit form instead of a create form. The public
     * courses/{slug}/reviews feed is ordered by latest and paginated, so a
     * student's older review is not reliably found there.
     */
    public function show(Request $request, Course $course)
    {
        $user = $request->user();

        $this->assertEnrolled($user->id, $course->id);

        $review = Review::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->with('user')
            ->first();

        return response()->json([
            'data' => $review ? new ReviewResource($review) : null,
        ]);
    }

    public function store(Request $request, Course $course)
    {
        $user = $request->user();

        $this->assertEnrolled($user->id, $course->id);

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $review = Review::updateOrCreate(
            ['user_id' => $user->id, 'course_id' => $course->id],
            ['rating' => $data['rating'], 'comment' => $data['comment'] ?? null],
        );

        return (new ReviewResource($review->load('user')))
            ->response()
            ->setStatusCode(201);
    }

    private function assertEnrolled(int $userId, int $courseId): void
    {
        $hasEnrollment = Enrollment::where('user_id', $userId)
            ->where('course_id', $courseId)
            ->exists();

        abort_unless($hasEnrollment, 403, 'Bạn cần đăng ký khóa học để đánh giá.');
    }
}
