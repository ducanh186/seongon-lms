<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminCourseResource extends CourseResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            // Both the `quiz` field name and the `quiz` eager-load key stay: renaming
            // them is a frontend-visible break that belongs with P3. Course::quiz()
            // is an expand-phase alias for exam(), so this reads the exams table.
            'quiz' => $this->whenLoaded('quiz', function () {
                if ($this->quiz === null) {
                    return null;
                }

                return [
                    'id' => $this->quiz->id,
                    'course_id' => $this->quiz->course_id,
                    'title' => $this->quiz->title,
                    'pass_score' => $this->quiz->pass_score,
                    'max_attempts' => $this->quiz->max_attempts,
                    'questions' => $this->quiz->questions->map(fn ($question) => [
                        'id' => $question->id,
                        'content' => $question->content,
                        'options' => $question->answers->map(fn ($option) => [
                            'id' => $option->id,
                            'content' => $option->content,
                            'is_correct' => $option->is_correct,
                        ])->values(),
                    ])->values(),
                ];
            }),
        ];
    }
}
