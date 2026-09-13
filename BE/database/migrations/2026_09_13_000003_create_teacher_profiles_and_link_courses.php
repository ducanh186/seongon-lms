<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->text('bio')->nullable();
            $table->string('avatar')->nullable();
            $table->timestamps();
            $table->unique('name');
        });

        Schema::table('courses', function (Blueprint $table): void {
            $table->foreignId('teacher_profile_id')->nullable()->after('instructor_id')->constrained('teacher_profiles')->nullOnDelete();
        });

        if (Schema::hasTable('instructors')) {
            DB::table('instructors')->orderBy('id')->get()->each(function (object $instructor): void {
                DB::table('teacher_profiles')->insertOrIgnore([
                    'id' => $instructor->id,
                    'name' => $instructor->name,
                    'bio' => $instructor->bio,
                    'avatar' => null,
                    'created_at' => $instructor->created_at,
                    'updated_at' => $instructor->updated_at,
                ]);
            });

            DB::table('courses')->whereNotNull('instructor_id')->update([
                'teacher_profile_id' => DB::raw('instructor_id'),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('teacher_profile_id');
        });

        Schema::dropIfExists('teacher_profiles');
    }
};
