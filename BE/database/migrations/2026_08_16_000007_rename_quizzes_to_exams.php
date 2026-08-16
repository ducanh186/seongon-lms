<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P0 step D3 — quizzes becomes the approved ERD Exams, and questions points at it
 * by exam_id. duration_minutes / total_questions / sort_order are ERD columns the
 * current schema lacks; they are nullable so no existing row needs a value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('quizzes', 'exams');

        Schema::table('exams', function (Blueprint $table) {
            $table->unsignedInteger('duration_minutes')->nullable();
            $table->unsignedInteger('total_questions')->nullable();
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->renameColumn('quiz_id', 'exam_id');
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->renameColumn('exam_id', 'quiz_id');
        });

        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn(['duration_minutes', 'total_questions']);
        });

        Schema::rename('exams', 'quizzes');
    }
};
