<?php

namespace App\Services;

use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\Question;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class LearningOperationsService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateLearningProgress(array $filters = []): LengthAwarePaginator
    {
        $model = (new LearningProgress)->setTable('learning_progress');
        $query = $model->newQuery()->with(['enrollment.user', 'enrollment.course', 'lesson']);

        if ($search = $filters['q'] ?? null) {
            $query->whereHas('enrollment.user', function (Builder $userQuery) use ($search): void {
                $userQuery->where(function (Builder $identityQuery) use ($search): void {
                    $identityQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            });
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->whereHas(
                'enrollment',
                fn (Builder $enrollmentQuery) => $enrollmentQuery->where('course_id', $courseId),
            );
        }

        if (array_key_exists('completed', $filters) && $filters['completed'] !== null) {
            $query->where('is_completed', filter_var($filters['completed'], FILTER_VALIDATE_BOOL));
        }

        return $query->latest('updated_at')->paginate(15)->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateQuestions(array $filters = []): LengthAwarePaginator
    {
        $query = Question::query()
            ->with('exam.course')
            ->withCount('answers');

        if ($search = $filters['q'] ?? null) {
            $query->where('content', 'like', "%{$search}%");
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->whereHas('exam', fn (Builder $examQuery) => $examQuery->where('course_id', $courseId));
        }

        if ($examId = $filters['exam_id'] ?? null) {
            $query->where('exam_id', $examId);
        }

        return $query->latest('updated_at')->paginate(15)->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateAnswers(array $filters = []): LengthAwarePaginator
    {
        $query = Answer::query()->with('question.exam.course');

        if ($search = $filters['q'] ?? null) {
            $query->where(function (Builder $answerQuery) use ($search): void {
                $answerQuery->where('content', 'like', "%{$search}%")
                    ->orWhereHas('question', fn (Builder $questionQuery) => $questionQuery->where('content', 'like', "%{$search}%"));
            });
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->whereHas(
                'question.exam',
                fn (Builder $examQuery) => $examQuery->where('course_id', $courseId),
            );
        }

        if ($examId = $filters['exam_id'] ?? null) {
            $query->whereHas('question', fn (Builder $questionQuery) => $questionQuery->where('exam_id', $examId));
        }

        if (array_key_exists('correct', $filters) && $filters['correct'] !== null) {
            $query->where('is_correct', filter_var($filters['correct'], FILTER_VALIDATE_BOOL));
        }

        return $query->latest('updated_at')->paginate(15)->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateLessons(array $filters = []): LengthAwarePaginator
    {
        $query = Lesson::query()
            ->with('course.categories')
            ->withCount('learningProgress');

        if ($search = $filters['q'] ?? null) {
            $query->where(function (Builder $lessonQuery) use ($search): void {
                $lessonQuery->where('title', 'like', "%{$search}%")
                    ->orWhereHas('course', fn (Builder $courseQuery) => $courseQuery->where('title', 'like', "%{$search}%"));
            });
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->where('course_id', $courseId);
        }

        return $query->latest('updated_at')->paginate(15)->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateExams(array $filters = []): LengthAwarePaginator
    {
        $query = Exam::query()
            ->with('course.categories')
            ->withCount(['questions', 'attempts']);

        if ($search = $filters['q'] ?? null) {
            $query->where(function (Builder $examQuery) use ($search): void {
                $examQuery->where('title', 'like', "%{$search}%")
                    ->orWhereHas('course', fn (Builder $courseQuery) => $courseQuery->where('title', 'like', "%{$search}%"));
            });
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->where('course_id', $courseId);
        }

        return $query->latest('updated_at')->paginate(15)->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateAttempts(array $filters = []): LengthAwarePaginator
    {
        $query = Attempt::query()->with(['enrollment.user', 'enrollment.course', 'exam']);

        if ($search = $filters['q'] ?? null) {
            $query->where(function (Builder $attemptQuery) use ($search): void {
                $attemptQuery
                    ->orWhereHas('enrollment.user', function (Builder $userQuery) use ($search): void {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('enrollment.course', fn (Builder $courseQuery) => $courseQuery->where('title', 'like', "%{$search}%"))
                    ->orWhereHas('exam', fn (Builder $examQuery) => $examQuery->where('title', 'like', "%{$search}%"));
            });
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->whereHas('enrollment', fn (Builder $enrollmentQuery) => $enrollmentQuery->where('course_id', $courseId));
        }

        if ($userId = $filters['user_id'] ?? null) {
            $query->whereHas('enrollment', fn (Builder $enrollmentQuery) => $enrollmentQuery->where('user_id', $userId));
        }

        if (array_key_exists('passed', $filters) && $filters['passed'] !== null) {
            $query->where('passed', filter_var($filters['passed'], FILTER_VALIDATE_BOOL));
        }

        return $query->latest('submitted_at')->paginate(15)->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateCertificateStatuses(array $filters = []): LengthAwarePaginator
    {
        $completedLessons = DB::table('learning_progress')
            ->selectRaw('count(*)')
            ->join('lessons', 'lessons.id', '=', 'learning_progress.lesson_id')
            ->whereColumn('learning_progress.enrollment_id', 'enrollments.id')
            ->whereColumn('lessons.course_id', 'enrollments.course_id')
            ->where('learning_progress.is_completed', true);

        $totalLessons = DB::table('lessons')
            ->selectRaw('count(*)')
            ->whereColumn('lessons.course_id', 'enrollments.course_id');

        $query = Enrollment::query()
            ->select('enrollments.*')
            ->addSelect([
                'completed_lessons' => $completedLessons,
                'total_lessons' => $totalLessons,
            ])
            ->with([
                'user',
                'course',
                'certificate',
                'attempts' => fn ($attemptQuery) => $attemptQuery->where('passed', true)->latest('submitted_at'),
                'attempts.exam',
            ]);

        if ($search = $filters['q'] ?? null) {
            $query->where(function (Builder $enrollmentQuery) use ($search): void {
                $enrollmentQuery
                    ->whereHas('user', function (Builder $userQuery) use ($search): void {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('course', fn (Builder $courseQuery) => $courseQuery->where('title', 'like', "%{$search}%"));
            });
        }

        if ($courseId = $filters['course_id'] ?? null) {
            $query->where('course_id', $courseId);
        }

        if ($userId = $filters['user_id'] ?? null) {
            $query->where('user_id', $userId);
        }

        match ($filters['status'] ?? null) {
            'eligible' => $this->applyEligibleFilter($query)->doesntHave('certificate'),
            'issued' => $this->applyEligibleFilter($query)->has('certificate'),
            'not_eligible' => $this->applyNotEligibleFilter($query),
            default => null,
        };

        return $query->latest('enrollments.updated_at')->paginate(15)->withQueryString();
    }

    private function applyEligibleFilter(Builder $query): Builder
    {
        return $query
            ->whereExists(function ($lessons): void {
                $lessons->selectRaw('1')
                    ->from('lessons')
                    ->whereColumn('lessons.course_id', 'enrollments.course_id');
            })
            ->whereNotExists(function ($missingLesson): void {
                $missingLesson->selectRaw('1')
                    ->from('lessons')
                    ->whereColumn('lessons.course_id', 'enrollments.course_id')
                    ->whereNotExists(function ($progress): void {
                        $progress->selectRaw('1')
                            ->from('learning_progress')
                            ->whereColumn('learning_progress.enrollment_id', 'enrollments.id')
                            ->whereColumn('learning_progress.lesson_id', 'lessons.id')
                            ->where('learning_progress.is_completed', true);
                    });
            })
            ->whereExists(function ($attempt): void {
                $attempt->selectRaw('1')
                    ->from('attempts')
                    ->join('exams', 'exams.id', '=', 'attempts.exam_id')
                    ->whereColumn('attempts.enrollment_id', 'enrollments.id')
                    ->whereColumn('exams.course_id', 'enrollments.course_id')
                    ->where('attempts.passed', true);
            });
    }

    private function applyNotEligibleFilter(Builder $query): Builder
    {
        return $query->where(function (Builder $notEligible): void {
            $notEligible
                ->whereNotExists(function ($lessons): void {
                    $lessons->selectRaw('1')
                        ->from('lessons')
                        ->whereColumn('lessons.course_id', 'enrollments.course_id');
                })
                ->orWhereExists(function ($missingLesson): void {
                    $missingLesson->selectRaw('1')
                        ->from('lessons')
                        ->whereColumn('lessons.course_id', 'enrollments.course_id')
                        ->whereNotExists(function ($progress): void {
                            $progress->selectRaw('1')
                                ->from('learning_progress')
                                ->whereColumn('learning_progress.enrollment_id', 'enrollments.id')
                                ->whereColumn('learning_progress.lesson_id', 'lessons.id')
                                ->where('learning_progress.is_completed', true);
                        });
                })
                ->orWhereNotExists(function ($attempt): void {
                    $attempt->selectRaw('1')
                        ->from('attempts')
                        ->join('exams', 'exams.id', '=', 'attempts.exam_id')
                        ->whereColumn('attempts.enrollment_id', 'enrollments.id')
                        ->whereColumn('exams.course_id', 'enrollments.course_id')
                        ->where('attempts.passed', true);
                });
        });
    }
}
