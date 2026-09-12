<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('instructors', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('bio')->nullable();
            $table->timestamps();
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->foreignId('instructor_id')->nullable()->constrained()->restrictOnDelete();
        });

        $instructors = [];

        DB::table('courses')->orderBy('id')->each(function (object $course) use (&$instructors): void {
            $name = $course->instructor_name;

            if ($name === null || trim($name) === '') {
                return;
            }

            if (! isset($instructors[$name])) {
                $instructor = DB::table('instructors')->where('name', $name)->first();

                if ($instructor === null) {
                    $instructorId = DB::table('instructors')->insertGetId([
                        'name' => $name,
                        'bio' => $this->nonEmptyBio($course->instructor_bio),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $instructor = (object) ['id' => $instructorId, 'bio' => $this->nonEmptyBio($course->instructor_bio)];
                }

                $instructors[$name] = $instructor;
            }

            $instructor = $instructors[$name];
            $bio = $this->nonEmptyBio($course->instructor_bio);

            if ($instructor->bio === null && $bio !== null) {
                DB::table('instructors')->where('id', $instructor->id)->update([
                    'bio' => $bio,
                    'updated_at' => now(),
                ]);
                $instructor->bio = $bio;
            }

            DB::table('courses')->where('id', $course->id)->update(['instructor_id' => $instructor->id]);
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('instructor_id');
        });

        Schema::dropIfExists('instructors');
    }

    private function nonEmptyBio(?string $bio): ?string
    {
        return $bio !== null && trim($bio) !== '' ? $bio : null;
    }
};
