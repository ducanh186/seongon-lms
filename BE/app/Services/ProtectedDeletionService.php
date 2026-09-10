<?php

namespace App\Services;

use App\Exceptions\ResourceHasDependenciesException;
use App\Models\Attempt;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Question;

class ProtectedDeletionService
{
    public function deleteCourse(Course $course): void
    {
        $dependencies = $this->positive([
            'enrollments' => $course->enrollments()->count(),
            'orders' => $course->orders()->count(),
            'reviews' => $course->reviews()->count(),
            'attempts' => Attempt::query()
                ->whereHas('exam', fn ($query) => $query->where('course_id', $course->id))
                ->count(),
        ]);
        if ($dependencies !== []) {
            throw new ResourceHasDependenciesException($dependencies, 'Không thể xóa khóa học vì đã có dữ liệu học tập hoặc giao dịch liên quan.');
        }
        $course->delete();
    }

    public function assertLessonDeletable(Lesson $lesson): void
    {
        $dependencies = $this->positive([
            'learning_progress' => $lesson->learningProgress()->count(),
        ]);
        if ($dependencies !== []) {
            throw new ResourceHasDependenciesException($dependencies, 'Không thể xóa bài học vì đã có tiến độ học tập liên quan.');
        }
    }

    public function assertQuestionMutable(Question $question): void
    {
        $attemptCount = Attempt::query()
            ->whereNotNull('answers')
            ->get(['id', 'answers'])
            ->filter(fn (Attempt $attempt) => collect($attempt->answers)->contains(
                fn (array $answer) => (int) ($answer['question_id'] ?? 0) === $question->id,
            ))
            ->count();
        if ($attemptCount > 0) {
            throw new ResourceHasDependenciesException(
                ['attempts' => $attemptCount],
                'Không thể sửa hoặc xóa câu hỏi vì đã được ghi nhận trong lượt làm bài.',
            );
        }
    }

    /** @param array<string, int> $dependencies @return array<string, int> */
    private function positive(array $dependencies): array
    {
        return array_filter($dependencies, fn (int $count) => $count > 0);
    }
}
