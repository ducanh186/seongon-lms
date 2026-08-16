<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P0 step D4 — align the learning tables and lesson ordering column with the
 * approved ERD. API field names remain unchanged until the frontend contract phase.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('lesson_progress', 'learning_progress');

        Schema::table('lessons', function (Blueprint $table) {
            $table->renameColumn('position', 'sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->renameColumn('sort_order', 'position');
        });

        Schema::rename('learning_progress', 'lesson_progress');
    }
};
