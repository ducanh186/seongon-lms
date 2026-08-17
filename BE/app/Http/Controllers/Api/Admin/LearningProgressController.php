<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminLearningProgressResource;
use App\Services\LearningOperationsService;
use Illuminate\Http\Request;

class LearningProgressController extends Controller
{
    public function __construct(private readonly LearningOperationsService $operations) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'completed' => ['nullable', 'boolean'],
        ]);

        return AdminLearningProgressResource::collection(
            $this->operations->paginateLearningProgress($filters),
        );
    }
}
