<?php

namespace App\Support;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;

trait InteractsWithEnrollment
{
    /**
     * Lấy enrollment ĐANG hoạt động của học viên cho khóa học.
     * 404 nếu chưa đăng ký, 403 nếu đã hết hạn (đồng thời đánh dấu expired).
     */
    protected function resolveActiveEnrollment(User $user, Course $course): Enrollment
    {
        $enrollment = Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        abort_if($enrollment === null, 404, 'Bạn chưa đăng ký khóa học này.');

        if ($enrollment->expires_at->isPast()) {
            if ($enrollment->status !== 'expired') {
                $enrollment->update(['status' => 'expired']);
            }
            abort(403, 'Khóa học đã hết hạn.');
        }

        return $enrollment;
    }
}
