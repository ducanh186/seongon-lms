<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminExamResource;
use App\Services\LearningOperationsService;
use Illuminate\Http\Request;

class ExamController extends Controller
{
    public function __construct(private readonly LearningOperationsService $operations) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
        ]);

        return AdminExamResource::collection($this->operations->paginateExams($filters));
    }
}
