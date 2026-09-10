<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCourseResource;
use App\Models\Course;
use App\Services\CourseService;
use App\Services\ProtectedDeletionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CourseController extends Controller
{
    public function __construct(
        private readonly CourseService $courses,
        private readonly ProtectedDeletionService $deletion,
    ) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'course_id' => ['nullable', 'integer', 'min:1'],
            'q' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['draft', 'published'])],
            'price' => ['nullable', 'numeric', 'min:0'],
            'published_on' => ['nullable', 'date_format:Y-m-d'],
        ]);

        return AdminCourseResource::collection($this->courses->paginateForAdmin($filters));
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
        $data = $this->validateData($request, $course);

        return new AdminCourseResource($this->courses->update($course, $data));
    }

    public function publish(Request $request, Course $course)
    {
        $data = $request->validate([
            'status' => ['required', 'in:draft,published'],
        ]);

        if ($data['status'] === 'published') {
            $course->load(['lessons:id,course_id', 'exam.questions.answers']);
            $exam = $course->exam;
            $hasValidQuestions = $exam
                && $exam->questions->count() >= 5
                && $exam->questions->every(fn ($question): bool => $question->answers->count() >= 2
                    && $question->answers->where('is_correct', true)->count() === 1);

            if ($course->lessons->isEmpty() || ! $exam || ! $hasValidQuestions) {
                throw ValidationException::withMessages([
                    'status' => ['Khóa học cần có bài học, bài kiểm tra và ít nhất 5 câu hỏi hợp lệ trước khi xuất bản.'],
                ]);
            }
        }

        return new AdminCourseResource($this->courses->setStatus($course, $data['status']));
    }

    public function destroy(Course $course)
    {
        $this->deletion->deleteCourse($course);

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateData(Request $request, ?Course $course = null): array
    {
        return $request->validate([
            'category_ids' => ['nullable', 'required_without:category_id', 'array', 'min:1'],
            'category_ids.*' => ['integer', 'distinct', 'exists:categories,id'],
            'category_id' => ['nullable', 'required_without:category_ids', 'integer', 'exists:categories,id'],
            'title' => ['required', 'string', 'max:255', Rule::unique('courses', 'title')->ignore($course)],
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
