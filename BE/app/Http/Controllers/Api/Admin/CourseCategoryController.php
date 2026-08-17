<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCourseCategoryResource;
use App\Services\CourseService;
use Illuminate\Http\Request;

class CourseCategoryController extends Controller
{
    public function __construct(private readonly CourseService $courses) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
        ]);

        return AdminCourseCategoryResource::collection(
            $this->courses->paginateCategoryAssignments($filters),
        );
    }
}
