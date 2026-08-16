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
        'correct_count',
        'wrong_count',
        'answers',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'passed' => 'boolean',
            'submitted_at' => 'datetime',
            // Approved replacement for the quiz_attempt_answers table:
            // [{ question_id: int, selected_answer_id: int|null, is_correct: bool }]
            'answers' => 'array',
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
