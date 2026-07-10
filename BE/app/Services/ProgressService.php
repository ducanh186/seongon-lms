<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonProgress;

class ProgressService
{
    public function completeLesson(Enrollment $enrollment, Lesson $lesson): LessonProgress
    {
        return LessonProgress::updateOrCreate(
            ['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id],
            ['is_completed' => true, 'completed_at' => now()],
        );
    }

    /**
     * @return array{completed:int,total:int,percent:int,can_take_exam:bool}
     */
    public function summary(Enrollment $enrollment): array
    {
        $total = Lesson::where('course_id', $enrollment->course_id)->count();
        $completed = LessonProgress::where('enrollment_id', $enrollment->id)
            ->where('is_completed', true)
            ->count();

        $percent = $total > 0 ? (int) round($completed / $total * 100) : 0;

        return [
            'completed' => $completed,
            'total' => $total,
            'percent' => $percent,
            'can_take_exam' => $total > 0 && $completed >= $total,
        ];
    }
}
