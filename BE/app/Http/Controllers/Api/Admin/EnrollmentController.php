<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnrollmentResource;
use App\Models\Enrollment;
use App\Services\EnrollmentService;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function __construct(private readonly EnrollmentService $enrollments) {}

    public function index(Request $request)
    {
        return EnrollmentResource::collection(
            $this->enrollments->paginateForAdmin($request->only(['status', 'course_id', 'user_id'])),
        );
    }

    public function show(Enrollment $enrollment)
    {
        return new EnrollmentResource($this->enrollments->forAdmin($enrollment));
    }
}
