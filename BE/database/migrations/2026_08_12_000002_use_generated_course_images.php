<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const TRACKS = [
        'seo-ai-max' => [
            'generated' => ['ai-search', 'seo', 'analytics'],
            'legacy' => [1, 4, 6],
        ],
        'google-ads' => [
            'generated' => ['ads', 'analytics', 'ads'],
            'legacy' => [2, 5, 6],
        ],
        'content-seo' => [
            'generated' => ['content', 'seo', 'ai-search'],
            'legacy' => [3, 4, 5],
        ],
    ];

    public function up(): void
    {
        foreach (self::TRACKS as $trackSlug => $mapping) {
            DB::table('courses')
                ->where('slug', 'like', "{$trackSlug}-%")
                ->where('thumbnail', 'like', '/course-images/course-thumb-%.svg')
                ->get(['id', 'slug'])
                ->each(function (object $course) use ($mapping): void {
                    $number = $this->courseNumber($course->slug);
                    $image = $mapping['generated'][($number - 1) % count($mapping['generated'])];

                    DB::table('courses')->where('id', $course->id)->update([
                        'thumbnail' => "/generated-images/course-{$image}.webp",
                    ]);
                });
        }

        DB::table('courses')
            ->where('slug', 'completed-demo-course')
            ->where('thumbnail', '/course-images/course-thumb-6.svg')
            ->update(['thumbnail' => '/generated-images/course-analytics.webp']);
    }

    public function down(): void
    {
        foreach (self::TRACKS as $trackSlug => $mapping) {
            DB::table('courses')
                ->where('slug', 'like', "{$trackSlug}-%")
                ->where('thumbnail', 'like', '/generated-images/course-%.webp')
                ->get(['id', 'slug'])
                ->each(function (object $course) use ($mapping): void {
                    $number = $this->courseNumber($course->slug);
                    $style = $mapping['legacy'][($number - 1) % count($mapping['legacy'])];

                    DB::table('courses')->where('id', $course->id)->update([
                        'thumbnail' => "/course-images/course-thumb-{$style}.svg",
                    ]);
                });
        }

        DB::table('courses')
            ->where('slug', 'completed-demo-course')
            ->where('thumbnail', '/generated-images/course-analytics.webp')
            ->update(['thumbnail' => '/course-images/course-thumb-6.svg']);
    }

    private function courseNumber(string $slug): int
    {
        preg_match('/-(\d+)$/', $slug, $matches);

        return max(1, (int) ($matches[1] ?? 1));
    }
};
