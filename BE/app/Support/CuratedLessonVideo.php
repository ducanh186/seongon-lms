<?php

namespace App\Support;

final class CuratedLessonVideo
{
    private const COURSE_OVERRIDES = [
        'seo-ai-max-01' => ['KjK5-L-wDVg', 'vxoMlEMtwuw', 'TPtCjy4n4cU', '_s2h7X-c2jE'],
        'seo-ai-max-14' => ['EqMjWU7vF2o', '_oU8lclN114', 'n-kxOhnSH-Q', 'HPL0O7Oe3j0'],
        'seo-ai-max-27' => ['RFlpwKQ0bEs', 'aLWQqlpwHK8', 'wTwnFcWUM3k', 'G_9-AkZch4k'],
        'content-seo-09' => ['uG1TG6z8Mz4', '40U1WlmnDFU', '5LF6SwB5jZ0', 'jJPS4M72FLg'],
        'completed-demo-course' => ['KjK5-L-wDVg', 'vxoMlEMtwuw'],
    ];

    private const SEO_VIDEO_IDS = ['KjK5-L-wDVg', 'vxoMlEMtwuw', 'TPtCjy4n4cU', '_s2h7X-c2jE'];

    private const GOOGLE_ADS_VIDEO_IDS = ['16-dF2p0kKo', 'hbM3befCOv4', 'X1IrczXHbtU', 'uQDAR7Kj08c'];

    private const CONTENT_VIDEO_IDS = ['uG1TG6z8Mz4', '40U1WlmnDFU', '5LF6SwB5jZ0', 'jJPS4M72FLg'];

    private const SOCIAL_CONTENT_VIDEO_ID = 'tJCEVBwvrqY';

    public static function forCourse(string $courseSlug, int $lessonIndex): string
    {
        if ($courseSlug === 'content-seo-11') {
            return self::embed(self::SOCIAL_CONTENT_VIDEO_ID);
        }

        $videoIds = self::COURSE_OVERRIDES[$courseSlug] ?? match (true) {
            str_starts_with($courseSlug, 'seo-ai-max-') => self::SEO_VIDEO_IDS,
            str_starts_with($courseSlug, 'google-ads-') => self::GOOGLE_ADS_VIDEO_IDS,
            default => self::CONTENT_VIDEO_IDS,
        };

        return self::embed($videoIds[$lessonIndex % count($videoIds)]);
    }

    public static function seo(): string
    {
        return self::embed(self::SEO_VIDEO_IDS[0]);
    }

    private static function embed(string $videoId): string
    {
        return "https://www.youtube.com/embed/{$videoId}";
    }
}
