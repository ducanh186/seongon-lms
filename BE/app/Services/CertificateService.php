<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\Enrollment;
use Illuminate\Support\Str;

class CertificateService
{
    /**
     * Cấp chứng chỉ cho enrollment (idempotent: đã có thì trả lại bản cũ).
     */
    public function issueForEnrollment(Enrollment $enrollment): Certificate
    {
        return Certificate::firstOrCreate(
            ['enrollment_id' => $enrollment->id],
            [
                'certificate_code' => $this->generateCode(),
                'issued_at' => now(),
            ],
        );
    }

    private function generateCode(): string
    {
        return 'SEONGON-'.now()->year.'-'.Str::upper(Str::random(8));
    }
}
