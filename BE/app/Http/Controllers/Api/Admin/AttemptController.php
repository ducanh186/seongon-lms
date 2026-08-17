<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminAttemptResource;
use App\Services\LearningOperationsService;
use Illuminate\Http\Request;

class AttemptController extends Controller
{
    public function __construct(private readonly LearningOperationsService $operations) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'passed' => ['nullable', 'boolean'],
        ]);

        return AdminAttemptResource::collection($this->operations->paginateAttempts($filters));
    }
}
