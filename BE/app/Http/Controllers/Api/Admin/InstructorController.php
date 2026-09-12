<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\ResourceHasDependenciesException;
use App\Http\Controllers\Controller;
use App\Http\Resources\InstructorResource;
use App\Models\Instructor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InstructorController extends Controller
{
    public function index()
    {
        return InstructorResource::collection(
            Instructor::withCount('courses')->orderBy('name')->get(),
        );
    }

    public function store(Request $request)
    {
        $instructor = Instructor::create($this->validated($request));
        $instructor->loadCount('courses');

        return (new InstructorResource($instructor))->response()->setStatusCode(201);
    }

    public function update(Request $request, Instructor $instructor)
    {
        $data = $this->validated($request, $instructor);

        DB::transaction(function () use ($instructor, $data): void {
            $instructor->update($data);
            $instructor->courses()->update([
                'instructor_name' => $instructor->name,
                'instructor_bio' => $instructor->bio,
            ]);
        });

        $instructor->loadCount('courses');

        return new InstructorResource($instructor);
    }

    public function destroy(Instructor $instructor)
    {
        $courseCount = $instructor->courses()->count();
        if ($courseCount > 0) {
            throw new ResourceHasDependenciesException(
                ['courses' => $courseCount],
                'Không thể xóa giảng viên đang được khóa học sử dụng.',
            );
        }

        $instructor->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?Instructor $instructor = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('instructors', 'name')->ignore($instructor),
            ],
            'bio' => ['nullable', 'string'],
        ], ['name.unique' => 'Tên giảng viên đã tồn tại.']);
    }
}
