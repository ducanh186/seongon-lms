<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCourseResource;
use App\Models\Course;
use App\Services\CourseService;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function __construct(private readonly CourseService $courses) {}

    public function index(Request $request)
    {
        return AdminCourseResource::collection($this->courses->paginateForAdmin($request->only(['q', 'status'])));
    }

    public function show(Course $course)
    {
        return new AdminCourseResource($this->courses->forAdmin($course));
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        return (new AdminCourseResource($this->courses->create($data)))->response()->setStatusCode(201);
    }

    public function update(Request $request, Course $course)
    {
        $data = $this->validateData($request);

        return new AdminCourseResource($this->courses->update($course, $data));
    }

    public function publish(Request $request, Course $course)
    {
        $data = $request->validate([
            'status' => ['required', 'in:draft,published'],
        ]);

        return new AdminCourseResource($this->courses->setStatus($course, $data['status']));
    }

    public function destroy(Course $course)
    {
        $course->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateData(Request $request): array
    {
        return $request->validate([
            'category_ids' => ['nullable', 'required_without:category_id', 'array', 'min:1'],
            'category_ids.*' => ['integer', 'distinct', 'exists:categories,id'],
            'category_id' => ['nullable', 'required_without:category_ids', 'integer', 'exists:categories,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string', 'max:2048'],
            'price' => ['required', 'numeric', 'min:0'],
            'instructor_name' => ['nullable', 'string', 'max:255'],
            'instructor_bio' => ['nullable', 'string'],
            'level' => ['nullable', 'in:beginner,intermediate,advanced'],
            'status' => ['required', 'in:draft,published'],
        ]);
    }
}
