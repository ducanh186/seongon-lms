<?php

use Database\Seeders\GeneratedDemoCatalogSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (GeneratedDemoCatalogSeeder::COURSE_VIDEO_IDS as $courseSlug => $videoIds) {
            $courseId = DB::table('courses')->where('slug', $courseSlug)->value('id');

            if ($courseId === null) {
                continue;
            }

            foreach ($videoIds as $index => $videoId) {
                DB::table('lessons')
                    ->where('course_id', $courseId)
                    ->where('position', $index + 1)
                    ->update(['video_url' => "https://www.youtube.com/embed/{$videoId}"]);
            }
        }
    }

    public function down(): void
    {
        $courseIds = DB::table('courses')
            ->whereIn('slug', array_keys(GeneratedDemoCatalogSeeder::COURSE_VIDEO_IDS))
            ->pluck('id');

        DB::table('lessons')
            ->whereIn('course_id', $courseIds)
            ->update(['video_url' => 'https://www.youtube.com/embed/aqz-KE-bpKQ']);
    }
};
