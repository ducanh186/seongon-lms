<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\PlaybackSetting;
use Illuminate\Support\Facades\DB;

class ProgressService
{
    private const COMPLETION_RATIO = 0.95;
    private const MAX_HEARTBEAT_CREDIT_SECONDS = 15;
    private const HEARTBEAT_TOLERANCE_SECONDS = 2;

    public function completeLesson(Enrollment $enrollment, Lesson $lesson): LearningProgress
    {
        $progress = LearningProgress::query()
            ->where('enrollment_id', $enrollment->id)
            ->where('lesson_id', $lesson->id)
            ->first();
        $duration = (int) ($lesson->duration ?? $progress?->video_duration_seconds ?? 0);
        $required = (int) ceil($duration * self::COMPLETION_RATIO);

        abort_if(
            $duration <= 0 || !$progress || (!$progress->is_completed && (int) ($progress->watched_seconds ?? 0) < $required),
            422,
            'Hãy xem đủ thời lượng video trước khi hoàn thành bài học.',
        );

        $progress->forceFill(['is_completed' => true, 'completed_at' => $progress->completed_at ?? now()])->save();

        return $progress->refresh();
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

            $configuredDuration = (int) ($lesson->duration ?? 0);
            $reportedDuration = max(1, $durationSeconds);
            $storedDuration = (int) ($progress->video_duration_seconds ?? 0);
            $duration = $configuredDuration > 0
                ? $configuredDuration
                : ($storedDuration > 0 ? $storedDuration : $reportedDuration);
            abort_if($duration <= 0, 422, 'Bài học chưa có thời lượng video chuẩn.');
            $position = min(max(0, $positionSeconds), $duration);
            $furthest = max((int) ($progress->furthest_position_seconds ?? 0), $position);
            $segments = is_array($progress->watched_segments) ? $progress->watched_segments : [];
            $watchedSeconds = (int) ($progress->watched_seconds ?? 0);
            $lastHeartbeat = $progress->last_heartbeat_at;
            if (!PlaybackSetting::current()->anti_cheat_enabled) {
                $watchedSeconds = max($watchedSeconds, $position);
                $segments = $this->mergeWatchedSegment($segments, 0, $position);
                $watchedSeconds = min($this->watchedSeconds($segments), $duration);
            } elseif ($lastHeartbeat) {
                $elapsed = max(0, now()->timestamp - $lastHeartbeat->timestamp);
                $previousPosition = (int) ($progress->resume_position_seconds ?? 0);
                $positionDelta = $position - $previousPosition;
                $maxCredit = min(self::MAX_HEARTBEAT_CREDIT_SECONDS, $elapsed + self::HEARTBEAT_TOLERANCE_SECONDS);
                if ($positionDelta > 0 && $positionDelta <= $maxCredit) {
                    $segments = $this->mergeWatchedSegment($segments, $previousPosition, $position);
                    $watchedSeconds = min($this->watchedSeconds($segments), $duration);
                }
            }
            $completed = $progress->is_completed || $watchedSeconds >= (int) ceil($duration * self::COMPLETION_RATIO);

            $progress->fill([
                'resume_position_seconds' => $position,
                'furthest_position_seconds' => $furthest,
                'video_duration_seconds' => $duration,
                'watched_seconds' => $watchedSeconds,
                'watched_segments' => $segments,
                'last_heartbeat_at' => now(),
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
            ->get(['watched_seconds', 'video_duration_seconds']);
        $trackedDuration = $playback->sum('video_duration_seconds');
        $watchedDuration = $playback->sum(fn (LearningProgress $item) => min(
            (int) ($item->watched_seconds ?? 0),
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

    /** @param array<int, array{start:int,end:int}> $segments */
    private function mergeWatchedSegment(array $segments, int $start, int $end): array
    {
        $merged = [];
        foreach ($segments as $segment) {
            if (!isset($segment['start'], $segment['end'])) continue;
            $merged[] = ['start' => (int) $segment['start'], 'end' => (int) $segment['end']];
        }
        $merged[] = ['start' => $start, 'end' => $end];
        usort($merged, fn (array $left, array $right): int => $left['start'] <=> $right['start']);

        $result = [];
        foreach ($merged as $segment) {
            $last = $result[count($result) - 1] ?? null;
            if ($last && $segment['start'] <= $last['end']) {
                $result[count($result) - 1]['end'] = max($last['end'], $segment['end']);
            } else {
                $result[] = $segment;
            }
        }

        return $result;
    }

    /** @param array<int, array{start:int,end:int}> $segments */
    private function watchedSeconds(array $segments): int
    {
        return array_sum(array_map(fn (array $segment): int => max(0, $segment['end'] - $segment['start']), $segments));
    }
}
