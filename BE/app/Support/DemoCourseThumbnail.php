<?php

namespace App\Support;

final class DemoCourseThumbnail
{
    private const TRACK_IMAGES = [
        'seo-ai-max' => ['ai-search', 'seo', 'analytics'],
        'google-ads' => ['ads', 'analytics', 'ads'],
        'content-seo' => ['content', 'seo', 'ai-search'],
    ];

    public static function forTrack(string $trackSlug, int $number): string
    {
        $images = self::TRACK_IMAGES[$trackSlug] ?? ['seo', 'ads', 'content', 'ai-search', 'analytics'];
        $image = $images[max(0, $number - 1) % count($images)];

        return "/generated-images/course-{$image}.webp";
    }

    public static function completed(): string
    {
        return '/generated-images/course-analytics.webp';
    }
}
