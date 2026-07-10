<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class CertificateController extends Controller
{
    public function download(Request $request, Course $course)
    {
        $user = $request->user();

        $enrollment = Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->firstOrFail();

        $certificate = $enrollment->certificate()->firstOrFail();

        $pdf = Pdf::loadView('certificates.default', [
            'certificate' => $certificate,
            'user' => $user,
            'course' => $course,
        ]);

        return $pdf->download('certificate-'.$certificate->certificate_code.'.pdf');
    }
}
