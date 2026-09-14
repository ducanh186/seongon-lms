<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->assertTeacherAccountsCanBeRemoved();
        $this->backfillTeacherProfiles();

        if (Schema::hasColumn('courses', 'instructor_id')) {
            Schema::table('courses', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('instructor_id');
            });
        }
        Schema::dropIfExists('instructors');

        $teacherRoleIds = DB::table('roles')->where('code', 'teacher')->pluck('id');
        DB::table('users')
            ->where('role', 'teacher')
            ->when($teacherRoleIds->isNotEmpty(), fn ($query) => $query->orWhereIn('role_id', $teacherRoleIds))
            ->delete();
        DB::table('roles')->where('code', 'teacher')->delete();

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('student','admin') NOT NULL DEFAULT 'student'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('student','admin','teacher') NOT NULL DEFAULT 'student'");
        }

        DB::table('roles')->insertOrIgnore([
            'code' => 'teacher',
            'name' => 'Giảng viên',
            'description' => 'Giảng viên và người quản lý nội dung bài học.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (! Schema::hasTable('instructors')) {
            Schema::create('instructors', function (Blueprint $table): void {
                $table->id();
                $table->string('name')->unique();
                $table->text('bio')->nullable();
                $table->timestamps();
            });
        }

        DB::table('teacher_profiles')->orderBy('id')->get()->each(function (object $profile): void {
            DB::table('instructors')->insertOrIgnore([
                'id' => $profile->id,
                'name' => $profile->name,
                'bio' => $profile->bio,
                'created_at' => $profile->created_at,
                'updated_at' => $profile->updated_at,
            ]);
        });

        if (! Schema::hasColumn('courses', 'instructor_id')) {
            Schema::table('courses', function (Blueprint $table): void {
                $table->foreignId('instructor_id')->nullable()->constrained('instructors')->restrictOnDelete();
            });
        }

        DB::table('courses')->whereNotNull('teacher_profile_id')->update([
            'instructor_id' => DB::raw('teacher_profile_id'),
        ]);
    }

    private function backfillTeacherProfiles(): void
    {
        if (Schema::hasTable('instructors')) {
            DB::table('instructors')->orderBy('id')->get()->each(function (object $instructor): void {
                $this->profileIdFor($instructor->name, $instructor->bio, $instructor->created_at, $instructor->updated_at);
            });
        }

        DB::table('courses')->orderBy('id')->get()->each(function (object $course): void {
            $profileId = $course->teacher_profile_id;

            if ($profileId !== null && DB::table('teacher_profiles')->where('id', $profileId)->exists()) {
                return;
            }

            $profileId = null;

            if (Schema::hasTable('instructors') && isset($course->instructor_id) && $course->instructor_id !== null) {
                $instructor = DB::table('instructors')->find($course->instructor_id);
                if ($instructor !== null) {
                    $profileId = $this->profileIdFor(
                        $instructor->name,
                        $instructor->bio,
                        $instructor->created_at,
                        $instructor->updated_at,
                    );
                }
            }

            if ($profileId === null && $this->nonEmpty($course->instructor_name) !== null) {
                $profileId = $this->profileIdFor(
                    $course->instructor_name,
                    $course->instructor_bio,
                    $course->created_at,
                    $course->updated_at,
                );
            }

            if ($profileId !== null) {
                DB::table('courses')->where('id', $course->id)->update(['teacher_profile_id' => $profileId]);
            }
        });
    }

    private function assertTeacherAccountsCanBeRemoved(): void
    {
        $teacherRoleIds = DB::table('roles')->where('code', 'teacher')->pluck('id');
        $teacherIds = DB::table('users')
            ->where('role', 'teacher')
            ->when($teacherRoleIds->isNotEmpty(), fn ($query) => $query->orWhereIn('role_id', $teacherRoleIds))
            ->pluck('id');

        if ($teacherIds->isEmpty()) {
            return;
        }

        foreach ([
            ['orders', 'user_id'],
            ['enrollments', 'user_id'],
            ['reviews', 'user_id'],
            ['user_records', 'user_id'],
            ['user_records', 'changed_by'],
            ['news_posts', 'author_id'],
        ] as [$table, $column]) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $column)
                && DB::table($table)->whereIn($column, $teacherIds)->exists()) {
                throw new \RuntimeException("Cannot remove teacher users: teacher users have historical dependencies in {$table}. Preserve or resolve these records before migrating.");
            }
        }
    }

    private function profileIdFor(string $name, ?string $bio, mixed $createdAt, mixed $updatedAt): int
    {
        $name = trim($name);
        $profile = DB::table('teacher_profiles')->where('name', $name)->first();

        if ($profile === null) {
            DB::table('teacher_profiles')->insertOrIgnore([
                'name' => $name,
                'bio' => $this->nonEmpty($bio),
                'avatar' => null,
                'created_at' => $createdAt ?? now(),
                'updated_at' => $updatedAt ?? now(),
            ]);
            $profile = DB::table('teacher_profiles')->where('name', $name)->firstOrFail();
        } elseif ($this->nonEmpty($profile->bio) === null && $this->nonEmpty($bio) !== null) {
            DB::table('teacher_profiles')->where('id', $profile->id)->update([
                'bio' => $this->nonEmpty($bio),
                'updated_at' => now(),
            ]);
        }

        return (int) $profile->id;
    }

    private function nonEmpty(?string $value): ?string
    {
        return $value !== null && trim($value) !== '' ? trim($value) : null;
    }
};
