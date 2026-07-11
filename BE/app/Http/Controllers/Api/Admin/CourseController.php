<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCourseResource;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $query = Course::with('category')->withCount('lessons')->withCount('enrollments');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($q = $request->query('q')) {
            $query->where('title', 'like', "%{$q}%");
        }

        return CourseResource::collection($query->latest()->paginate(15)->withQueryString());
    }

    public function show(Course $course)
    {
        $course->load(['category', 'lessons', 'quiz.questions.options'])
            ->loadCount(['lessons', 'enrollments', 'reviews']);

        return new AdminCourseResource($course);
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $data['slug'] = $this->uniqueSlug($data['title']);

        $course = Course::create($data);

        return (new CourseResource($course->load('category')))->response()->setStatusCode(201);
    }

    public function update(Request $request, Course $course)
    {
        $data = $this->validateData($request);
        $course->update($data);

        return new CourseResource($course->load('category'));
    }

    public function publish(Request $request, Course $course)
    {
        $data = $request->validate([
            'status' => ['required', 'in:draft,published'],
        ]);

        $course->update(['status' => $data['status']]);

        return new CourseResource($course);
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
            'category_id' => ['required', 'exists:categories,id'],
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

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 1;

        while (Course::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
