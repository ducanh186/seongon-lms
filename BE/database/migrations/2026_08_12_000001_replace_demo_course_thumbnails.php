<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TRACK_STYLES = [
        'seo-ai-max' => [1, 4, 6],
        'google-ads' => [2, 5, 6],
        'content-seo' => [3, 4, 5],
    ];

    public function up(): void
    {
        foreach (self::TRACK_STYLES as $trackSlug => $styles) {
            DB::table('courses')
                ->where('slug', 'like', "{$trackSlug}-%")
                ->get(['id', 'slug'])
                ->each(function (object $course) use ($styles): void {
                    preg_match('/-(\d+)$/', $course->slug, $matches);
                    $number = max(1, (int) ($matches[1] ?? 1));
                    $style = $styles[($number - 1) % count($styles)];

                    DB::table('courses')->where('id', $course->id)->update([
                        'thumbnail' => "/course-images/course-thumb-{$style}.svg",
                    ]);
                });
        }

        DB::table('courses')->where('slug', 'completed-demo-course')->update([
            'thumbnail' => '/course-images/course-thumb-6.svg',
        ]);

        DB::table('courses')
            ->where('thumbnail', 'like', '%picsum.photos%')
            ->orderBy('id')
            ->get(['id'])
            ->values()
            ->each(function (object $course, int $index): void {
                $style = ($index % 6) + 1;

                DB::table('courses')->where('id', $course->id)->update([
                    'thumbnail' => "/course-images/course-thumb-{$style}.svg",
                ]);
            });
    }

    public function down(): void
    {
        foreach (array_keys(self::TRACK_STYLES) as $trackSlug) {
            DB::table('courses')
                ->where('slug', 'like', "{$trackSlug}-%")
                ->get(['id', 'slug'])
                ->each(function (object $course): void {
                    preg_match('/-(\d+)$/', $course->slug, $matches);
                    $number = max(1, (int) ($matches[1] ?? 1));

                    DB::table('courses')->where('id', $course->id)->update([
                        'thumbnail' => "/course-images/course-thumb-{$number}.svg",
                    ]);
                });
        }

        DB::table('courses')->where('slug', 'completed-demo-course')->update([
            'thumbnail' => '/course-images/course-thumb-6.svg',
        ]);
    }
};
