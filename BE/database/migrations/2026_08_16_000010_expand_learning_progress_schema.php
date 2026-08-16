<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P0 step D4 expand/migrate phase.
 *
 * The legacy table and column stay available until a later deployment proves
 * that no running application version depends on them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->integer('sort_order')->nullable()->after('position');
            $table->index(['course_id', 'sort_order']);
        });

        Schema::create('learning_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['enrollment_id', 'lesson_id']);
        });

        DB::table('lessons')->update(['sort_order' => DB::raw('position')]);

        DB::table('learning_progress')->insertUsing(
            ['id', 'enrollment_id', 'lesson_id', 'is_completed', 'completed_at', 'created_at', 'updated_at'],
            DB::table('lesson_progress')->select([
                'id',
                'enrollment_id',
                'lesson_id',
                'is_completed',
                'completed_at',
                'created_at',
                'updated_at',
            ]),
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_progress');

        Schema::table('lessons', function (Blueprint $table) {
            $table->dropIndex(['course_id', 'sort_order']);
            $table->dropColumn('sort_order');
        });
    }
};
