<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCertificateStatusResource;
use App\Services\LearningOperationsService;
use Illuminate\Http\Request;

class CertificateController extends Controller
{
    public function __construct(private readonly LearningOperationsService $operations) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', 'in:not_eligible,eligible,issued'],
        ]);

        return AdminCertificateStatusResource::collection($this->operations->paginateCertificateStatuses($filters));
    }
}
