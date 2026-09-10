<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\LearningProgress;
use App\Models\Lesson;
use Illuminate\Support\Facades\DB;

class ProgressService
{
    public function completeLesson(Enrollment $enrollment, Lesson $lesson): LearningProgress
    {
        return LearningProgress::updateOrCreate(
            ['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id],
            ['is_completed' => true, 'completed_at' => now()],
        );
    }

    public function recordPlayback(
        Enrollment $enrollment,
        Lesson $lesson,
        int $positionSeconds,
        int $durationSeconds,
    ): LearningProgress {
        return DB::transaction(function () use ($enrollment, $lesson, $positionSeconds, $durationSeconds) {
            $progress = LearningProgress::query()
                ->where('enrollment_id', $enrollment->id)
                ->where('lesson_id', $lesson->id)
                ->lockForUpdate()
                ->first();

            $progress ??= new LearningProgress([
                'enrollment_id' => $enrollment->id,
                'lesson_id' => $lesson->id,
            ]);

            $position = min(max(0, $positionSeconds), $durationSeconds);
            $furthest = max((int) ($progress->furthest_position_seconds ?? 0), $position);
            $completed = $progress->is_completed || $furthest / $durationSeconds >= 0.95;

            $progress->fill([
                'resume_position_seconds' => $position,
                'furthest_position_seconds' => $furthest,
                'video_duration_seconds' => $durationSeconds,
                'is_completed' => $completed,
                'completed_at' => $completed ? ($progress->completed_at ?? now()) : null,
            ])->save();

            return $progress->refresh();
        });
    }

    /**
     * @return array{completed:int,total:int,percent:int,video_percent:int,can_take_exam:bool}
     */
    public function summary(Enrollment $enrollment): array
    {
        $total = Lesson::where('course_id', $enrollment->course_id)->count();
        $completed = LearningProgress::where('enrollment_id', $enrollment->id)
            ->where('is_completed', true)
            ->count();

        $percent = $total > 0 ? (int) round($completed / $total * 100) : 0;
        $playback = LearningProgress::where('enrollment_id', $enrollment->id)
            ->whereNotNull('video_duration_seconds')
            ->where('video_duration_seconds', '>', 0)
            ->get(['furthest_position_seconds', 'video_duration_seconds']);
        $trackedDuration = $playback->sum('video_duration_seconds');
        $watchedDuration = $playback->sum(fn (LearningProgress $item) => min(
            (int) ($item->furthest_position_seconds ?? 0),
            (int) $item->video_duration_seconds,
        ));
        $videoPercent = $trackedDuration > 0
            ? (int) floor($watchedDuration / $trackedDuration * 100)
            : $percent;

        return [
            'completed' => $completed,
            'total' => $total,
            'percent' => $percent,
            'video_percent' => $videoPercent,
            'can_take_exam' => $total > 0 && $completed >= $total,
        ];
    }
}
