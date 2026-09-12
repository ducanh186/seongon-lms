<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'enrollment_id',
        'exam_id',
        'score',
        'passed',
        'attempt_number',
        'status',
        'started_at',
        'expires_at',
        'finished_at',
        'correct_count',
        'wrong_count',
        'answers',
        'question_ids',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'passed' => 'boolean',
            'submitted_at' => 'datetime',
            'started_at' => 'datetime',
            'expires_at' => 'datetime',
            'finished_at' => 'datetime',
            // Approved replacement for the quiz_attempt_answers table:
            // [{ question_id: int, selected_answer_id: int|null, is_correct: bool }]
            'answers' => 'array',
            'question_ids' => 'array',
        ];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
