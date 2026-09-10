<?php

namespace Database\Seeders;

use App\Models\Enrollment;
use App\Models\LearningProgress;
use App\Services\ExamGradingService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoDashboardSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            // Both identifiers must match the existing generated demo dataset.
            // Never reset the catalog or modify real registrations/payments.
            $enrollments = Enrollment::query()
                ->whereHas('order', fn ($query) => $query->where('status', 'paid')->where('transaction_ref', 'like', 'DEMO-%'))
                ->with(['user', 'order', 'course.lessons', 'course.exam.questions.answers', 'certificate', 'attempts', 'learningProgress'])
                ->orderBy('id')->lockForUpdate()->get()
                ->filter(function (Enrollment $enrollment): bool {
                    $email = $enrollment->user?->email ?? '';

                    return preg_match('/^DEMO-\d{3}-\d{3}$/', $enrollment->order->transaction_ref) === 1
                        && preg_match('/^(student(?:00[1-9]|0[1-9]\d|100)@demo\.seongon\.vn|student@seongon\.vn|learner(?:0[1-9]|1[0-5])@seongon\.vn)$/', $email) === 1
                        && $enrollment->order->user_id === $enrollment->user_id
                        && $enrollment->order->course_id === $enrollment->course_id;
                })->values();

            $now = CarbonImmutable::now();
            $start = $now->startOfMonth()->subMonths(5);
            $remaining = max(0, (int) round($enrollments->count() * 0.4) - $enrollments->filter(fn ($row) => $row->certificate !== null)->count());

            foreach ($enrollments as $index => $enrollment) {
                // Preserve previously attempted/certified enrollments on repeat builds.
                if ($enrollment->attempts->isNotEmpty() || $enrollment->certificate || $enrollment->isExpired()) {
                    continue;
                }

                // Stable weighted buckets create a varied six-month distribution.
                $bucket = ($index * 37) % 100;
                $offset = collect([13, 29, 47, 62, 82, 100])->search(fn ($limit) => $bucket < $limit);
                $month = $start->addMonths($offset);
                $days = $month->isSameMonth($now) ? $now->day : $month->daysInMonth;
                $registeredAt = $month->addDays(($index * 7) % $days);
                $completedAt = $registeredAt->addDays(5)->min($now);

                $enrollment->forceFill(['created_at' => $registeredAt, 'enrolled_at' => $registeredAt])->save();
                $enrollment->order->forceFill(['created_at' => $registeredAt, 'paid_at' => $registeredAt])->save();
                foreach ($enrollment->learningProgress as $progress) {
                    if ($progress->is_completed) {
                        $progress->forceFill(['created_at' => $completedAt, 'completed_at' => $completedAt])->save();
                    }
                }

                $exam = $enrollment->course?->exam;
                if ($remaining === 0 || ! $exam || $enrollment->course->lessons->isEmpty()
                    || $exam->questions->isEmpty() || $exam->max_attempts < 1
                    || $exam->questions->contains(fn ($question) => ! $question->answers->contains('is_correct', true))) {
                    continue;
                }

                foreach ($enrollment->course->lessons as $lesson) {
                    LearningProgress::updateOrCreate(
                        ['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id],
                        ['is_completed' => true, 'completed_at' => $completedAt],
                    );
                }
                $answers = $exam->questions->map(fn ($question) => [
                    'question_id' => $question->id,
                    'option_id' => $question->answers->firstWhere('is_correct', true)->id,
                ])->all();
                $attempt = app(ExamGradingService::class)->grade($enrollment, $exam, $answers);
                throw_unless($attempt->passed, \RuntimeException::class, 'Demo completion requires a passing exam.');
                $attempt->forceFill(['created_at' => $completedAt, 'submitted_at' => $completedAt])->save();
                $enrollment->certificate()->firstOrFail()->forceFill(['created_at' => $completedAt, 'issued_at' => $completedAt])->save();
                $remaining--;
            }
        });
    }
}
