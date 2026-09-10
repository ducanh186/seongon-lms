<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class LearningProgress extends Model
{
    use HasFactory;

    protected $table = 'lesson_progress';

    protected $attributes = ['is_completed' => false];

    protected $fillable = [
        'enrollment_id',
        'lesson_id',
        'is_completed',
        'completed_at',
        'resume_position_seconds',
        'furthest_position_seconds',
        'video_duration_seconds',
    ];

    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
            'completed_at' => 'datetime',
            'resume_position_seconds' => 'integer',
            'furthest_position_seconds' => 'integer',
            'video_duration_seconds' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saved(function (self $progress): void {
            DB::table('learning_progress')->updateOrInsert(
                [
                    'enrollment_id' => $progress->enrollment_id,
                    'lesson_id' => $progress->lesson_id,
                ],
                [
                    'is_completed' => $progress->is_completed,
                    'completed_at' => $progress->completed_at,
                    'resume_position_seconds' => $progress->resume_position_seconds,
                    'furthest_position_seconds' => $progress->furthest_position_seconds,
                    'video_duration_seconds' => $progress->video_duration_seconds,
                    'created_at' => $progress->created_at,
                    'updated_at' => $progress->updated_at,
                ],
            );
        });

        static::deleted(function (self $progress): void {
            DB::table('learning_progress')
                ->where('enrollment_id', $progress->enrollment_id)
                ->where('lesson_id', $progress->lesson_id)
                ->delete();
        });
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
