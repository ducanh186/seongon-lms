<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['lesson_progress', 'learning_progress'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedInteger('resume_position_seconds')->nullable();
                $table->unsignedInteger('furthest_position_seconds')->nullable();
                $table->unsignedInteger('video_duration_seconds')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['learning_progress', 'lesson_progress'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn([
                    'resume_position_seconds',
                    'furthest_position_seconds',
                    'video_duration_seconds',
                ]);
            });
        }
    }
};
