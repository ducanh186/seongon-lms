<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['lesson_progress', 'learning_progress'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->unsignedInteger('watched_seconds')->default(0);
                $table->json('watched_segments')->nullable();
                $table->timestamp('last_heartbeat_at')->nullable();
            });

            // Preserve historical playback while making all new credit server-validated.
            DB::table($tableName)
                ->whereNotNull('furthest_position_seconds')
                ->where('video_duration_seconds', '>', 0)
                ->get(['id', 'furthest_position_seconds', 'video_duration_seconds'])
                ->each(function (object $progress) use ($tableName): void {
                    $watched = min(
                        (int) $progress->furthest_position_seconds,
                        (int) $progress->video_duration_seconds,
                    );
                    DB::table($tableName)->where('id', $progress->id)->update([
                        'watched_seconds' => $watched,
                        'watched_segments' => json_encode([['start' => 0, 'end' => $watched]], JSON_THROW_ON_ERROR),
                    ]);
                });
        }
    }

    public function down(): void
    {
        foreach (['learning_progress', 'lesson_progress'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn(['watched_seconds', 'watched_segments', 'last_heartbeat_at']);
            });
        }
    }
};
