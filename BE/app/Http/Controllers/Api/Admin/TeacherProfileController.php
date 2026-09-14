<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\ResourceHasDependenciesException;
use App\Http\Controllers\Controller;
use App\Http\Resources\TeacherProfileResource;
use App\Models\TeacherProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class TeacherProfileController extends Controller
{
    public function index()
    {
        return TeacherProfileResource::collection(
            TeacherProfile::withCount('courses')->orderBy('name')->get(),
        );
    }

    public function store(Request $request)
    {
        $profile = TeacherProfile::create($this->validated($request));
        $profile->loadCount('courses');

        return (new TeacherProfileResource($profile))->response()->setStatusCode(201);
    }

    public function update(Request $request, TeacherProfile $teacherProfile)
    {
        $teacherProfile->update($this->validated($request, $teacherProfile));
        $teacherProfile->loadCount('courses');

        return new TeacherProfileResource($teacherProfile);
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);

        $path = $request->file('image')->store('teacher-profile-images', 'public');

        return response()->json(['url' => Storage::url($path)], 201);
    }

    public function destroy(TeacherProfile $teacherProfile)
    {
        $courseCount = $teacherProfile->courses()->count();
        if ($courseCount > 0) {
            throw new ResourceHasDependenciesException(
                ['courses' => $courseCount],
                'Không thể xóa người biên soạn chương trình học đang được khóa học sử dụng.',
            );
        }

        $teacherProfile->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?TeacherProfile $teacherProfile = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('teacher_profiles', 'name')->ignore($teacherProfile)],
            'bio' => ['nullable', 'string'],
            'avatar' => ['nullable', 'string', 'max:2048'],
        ]);
    }
}
