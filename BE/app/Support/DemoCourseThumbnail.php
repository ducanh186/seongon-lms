<?php

namespace App\Support;

final class DemoCourseThumbnail
{
    private const TRACK_STYLES = [
        'seo-ai-max' => [1, 4, 6],
        'google-ads' => [2, 5, 6],
        'content-seo' => [3, 4, 5],
    ];

    public static function forTrack(string $trackSlug, int $number): string
    {
        $styles = self::TRACK_STYLES[$trackSlug] ?? [1, 2, 3, 4, 5, 6];
        $style = $styles[max(0, $number - 1) % count($styles)];

        return "/course-images/course-thumb-{$style}.svg";
    }

    public static function completed(): string
    {
        return '/course-images/course-thumb-6.svg';
    }
}
