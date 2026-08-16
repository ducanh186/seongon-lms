<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['course_id', 'category_id']);
        });

        $this->backfillFromCourseCategoryId();
    }

    public function down(): void
    {
        Schema::dropIfExists('course_categories');
    }

    /**
     * Carry the existing one-to-many courses.category_id across to the pivot so no
     * classification is lost when the column is dropped in a later phase.
     */
    private function backfillFromCourseCategoryId(): void
    {
        if (! Schema::hasColumn('courses', 'category_id')) {
            return;
        }

        $now = now();

        DB::table('courses')
            ->select('id', 'category_id')
            ->whereNotNull('category_id')
            ->orderBy('id')
            ->chunkById(500, function ($courses) use ($now) {
                DB::table('course_categories')->insertOrIgnore(
                    $courses->map(fn ($course) => [
                        'course_id' => $course->id,
                        'category_id' => $course->category_id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all()
                );
            });
    }
};
