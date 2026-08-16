<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lesson extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'title',
        'video_url',
        'description',
        'duration',
        'position',
        'sort_order',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $lesson): void {
            if ($lesson->isDirty('sort_order')) {
                $lesson->position = $lesson->sort_order;
            } elseif ($lesson->isDirty('position')) {
                $lesson->sort_order = $lesson->position;
            }
        });
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function learningProgress(): HasMany
    {
        return $this->hasMany(LearningProgress::class);
    }
}
