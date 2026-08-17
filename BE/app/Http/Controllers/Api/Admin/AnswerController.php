<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminAnswerIndexResource;
use App\Services\LearningOperationsService;
use Illuminate\Http\Request;

class AnswerController extends Controller
{
    public function __construct(private readonly LearningOperationsService $operations) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'exam_id' => ['nullable', 'integer', 'exists:exams,id'],
            'correct' => ['nullable', 'boolean'],
        ]);

        return AdminAnswerIndexResource::collection(
            $this->operations->paginateAnswers($filters),
        );
    }
}
