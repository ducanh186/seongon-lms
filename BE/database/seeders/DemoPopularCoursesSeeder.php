<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use App\Services\EnrollmentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoPopularCoursesSeeder extends Seeder
{
    // Participation percentages, not presentation-layer ranking/count overrides.
    private const POPULARITY = [
        'seo-ai-max-01' => 72,
        'google-ads-01' => 54,
        'content-seo-01' => 39,
        'seo-ai-max-02' => 27,
        'google-ads-02' => 16,
    ];

    public function run(): void
    {
        DB::transaction(function (): void {
            $emails = collect(range(1, 100))->map(fn ($number) => sprintf('student%03d@demo.seongon.vn', $number));
            $students = User::whereIn('email', $emails)->where('role', 'student')->where('status', 'active')
                ->orderBy('id')->lockForUpdate()->get()->keyBy('email');

            foreach (array_keys(self::POPULARITY) as $index => $slug) {
                $course = Course::where('slug', $slug)->published()->first();
                if (! $course) {
                    continue;
                }

                foreach (range(1, 100) as $number) {
                    $student = $students[sprintf('student%03d@demo.seongon.vn', $number)] ?? null;
                    if (! $student || (($number * 37 + $index * 19) % 100) >= self::POPULARITY[$slug]) {
                        continue;
                    }
                    // Never renew/reassign an existing enrollment or its progress/certificate.
                    if (Enrollment::where('user_id', $student->id)->where('course_id', $course->id)->exists()) {
                        continue;
                    }

                    // Slots 901–905 are reserved for additive popularity fixtures.
                    $reference = sprintf('DEMO-%03d-%03d', $number, 901 + $index);
                    if (Order::where('transaction_ref', $reference)->exists()) {
                        continue;
                    }
                    $order = Order::create([
                        'user_id' => $student->id,
                        'course_id' => $course->id,
                        'amount' => $course->price,
                        'status' => 'paid',
                        'payment_method' => 'card',
                        'transaction_ref' => $reference,
                        'paid_at' => now(),
                    ]);
                    app(EnrollmentService::class)->createFromOrder($order);
                }
            }
        });
    }
}
