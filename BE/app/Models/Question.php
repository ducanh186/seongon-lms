<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Question extends Model
{
    use HasFactory;

    protected $fillable = ['exam_id', 'content', 'sort_order'];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(Answer::class);
    }

    /**
     * Expand-phase alias for answers(). Admin\QuizController and
     * Admin\QuestionController serialise raw models, so the relation name is part
     * of the JSON contract the frontend reads. Delete once the frontend moves to
     * `answers` in P3.
     */
    public function options(): HasMany
    {
        return $this->answers();
    }
}
