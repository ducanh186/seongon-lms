<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminLessonResource;
use App\Http\Resources\LessonResource;
use App\Models\Course;
use App\Models\Lesson;
use App\Services\LearningOperationsService;
use App\Services\ProtectedDeletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LessonController extends Controller
{
    public function __construct(
        private readonly LearningOperationsService $operations,
        private readonly ProtectedDeletionService $deletion,
    ) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
        ]);

        return AdminLessonResource::collection($this->operations->paginateLessons($filters));
    }

    public function store(Request $request, Course $course)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'video_url' => ['required', 'string', 'max:2048'],
            'description' => ['nullable', 'string'],
            'duration' => ['nullable', 'integer', 'min:0'],
            'position' => ['nullable', 'integer', 'min:0'],
            'material' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $this->storeMaterial($request, $data);

        $data['sort_order'] = $data['position'] ?? (int) $course->lessons()->max('position') + 1;
        unset($data['position']);

        $lesson = $course->lessons()->create($data);

        return (new LessonResource($lesson))->response()->setStatusCode(201);
    }

    public function update(Request $request, Lesson $lesson)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'video_url' => ['required', 'string', 'max:2048'],
            'description' => ['nullable', 'string'],
            'duration' => ['nullable', 'integer', 'min:0'],
            'position' => ['nullable', 'integer', 'min:0'],
            'material' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        if ($request->hasFile('material')) {
            $this->deleteStoredMaterial($lesson->material_url);
        }
        $this->storeMaterial($request, $data);

        if (array_key_exists('position', $data)) {
            $data['sort_order'] = $data['position'];
            unset($data['position']);
        }

        $lesson->update($data);

        return new LessonResource($lesson);
    }

    public function destroy(Lesson $lesson)
    {
        $this->deletion->assertLessonDeletable($lesson);
        $this->deleteStoredMaterial($lesson->material_url);
        $lesson->delete();

        return response()->noContent();
    }

    public function reorder(Request $request, Course $course)
    {
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer', 'exists:lessons,id'],
        ]);

        foreach ($data['order'] as $index => $lessonId) {
            $course->lessons()->whereKey($lessonId)->update([
                'position' => $index + 1,
                'sort_order' => $index + 1,
            ]);
        }

        return LessonResource::collection($course->lessons()->get());
    }

    private function storeMaterial(Request $request, array &$data): void
    {
        unset($data['material']);

        if (! $request->hasFile('material')) {
            return;
        }

        $path = $request->file('material')->store('lesson-materials', 'public');
        $data['material_url'] = '/storage/'.$path;
    }

    private function deleteStoredMaterial(?string $materialUrl): void
    {
        if (! $materialUrl || ! str_starts_with($materialUrl, '/storage/lesson-materials/')) {
            return;
        }

        Storage::disk('public')->delete(str_replace('/storage/', '', $materialUrl));
    }
}
