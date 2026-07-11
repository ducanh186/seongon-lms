<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminCourseResource extends CourseResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
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
                        'options' => $question->options->map(fn ($option) => [
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
