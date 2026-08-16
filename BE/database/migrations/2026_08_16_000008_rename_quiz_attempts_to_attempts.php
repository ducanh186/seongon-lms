<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P0 step D3 — quiz_attempts becomes the approved ERD Attempts.
 *
 * correct_count / wrong_count / attempt_number are ERD columns. answers is the
 * approved JSON column that replaces the quiz_attempt_answers table, so one exam
 * sitting is a single aggregate root rather than a parent plus child rows.
 *
 * quiz_id is renamed to exam_id rather than dropped: the API still exposes it and
 * QuizAttemptResource depends on it. Recorded as a deviation in ERD_FEATURE_GAPS.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('quiz_attempts', 'attempts');

        Schema::table('attempts', function (Blueprint $table) {
            $table->renameColumn('quiz_id', 'exam_id');
            $table->renameColumn('attempt_no', 'attempt_number');
        });

        Schema::table('attempts', function (Blueprint $table) {
            $table->unsignedInteger('correct_count')->default(0);
            $table->unsignedInteger('wrong_count')->default(0);
            $table->json('answers')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('attempts', function (Blueprint $table) {
            $table->dropColumn(['correct_count', 'wrong_count', 'answers']);
        });

        Schema::table('attempts', function (Blueprint $table) {
            $table->renameColumn('exam_id', 'quiz_id');
            $table->renameColumn('attempt_number', 'attempt_no');
        });

        Schema::rename('attempts', 'quiz_attempts');
    }
};
