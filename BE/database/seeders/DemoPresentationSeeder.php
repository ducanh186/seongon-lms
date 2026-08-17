<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\User;
use App\Support\CuratedLessonVideo;
use App\Support\DemoStudentNames;
use Illuminate\Database\Seeder;

class DemoPresentationSeeder extends Seeder
{
    public function run(): void
    {
        User::query()
            ->where('email', 'like', 'student%@demo.seongon.vn')
            ->get()
            ->each(function (User $student): void {
                if (preg_match('/student(\d{3})@demo\.seongon\.vn/', $student->email, $matches) === 1) {
                    $student->update(['name' => DemoStudentNames::forNumber((int) $matches[1])]);
                }
            });

        User::query()->where('email', 'student@seongon.vn')->update([
            'name' => DemoStudentNames::forNumber(1),
        ]);

        User::query()
            ->where('email', 'like', 'learner%@seongon.vn')
            ->get()
            ->each(function (User $student): void {
                if (preg_match('/learner(\d{2})@seongon\.vn/', $student->email, $matches) === 1) {
                    $student->update(['name' => DemoStudentNames::forNumber(((int) $matches[1]) + 1)]);
                }
            });

        User::query()
            ->where('role', 'student')
            ->where('email', '!=', 'student@seongon.vn')
            ->where('email', 'not like', 'student%@demo.seongon.vn')
            ->where('email', 'not like', 'learner%@seongon.vn')
            ->orderBy('id')
            ->get()
            ->values()
            ->each(
                fn (User $student, int $index) => $student->update([
                    'name' => DemoStudentNames::forNumber(121 + $index),
                ]),
            );

        Course::query()
            ->where(function ($query): void {
                $query->where('slug', 'like', 'seo-ai-max-%')
                    ->orWhere('slug', 'like', 'google-ads-%')
                    ->orWhere('slug', 'like', 'content-seo-%')
                    ->orWhere('slug', 'completed-demo-course');
            })
            ->with(['lessons' => fn ($query) => $query->orderBy('sort_order')])
            ->get()
            ->each(function (Course $course): void {
                $course->lessons->values()->each(
                    fn ($lesson, int $index) => $lesson->update([
                        'video_url' => CuratedLessonVideo::forCourse($course->slug, $index),
                    ]),
                );
            });

        $this->call(DemoNewsSeeder::class);
    }
}
