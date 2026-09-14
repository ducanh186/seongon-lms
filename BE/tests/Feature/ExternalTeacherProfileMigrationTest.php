<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Course;
use App\Models\Role;
use App\Models\TeacherProfile;
use Database\Seeders\CompletedCourseDemoSeeder;
use Database\Seeders\DemoAccountSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ExternalTeacherProfileMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seed_creates_external_profiles_without_teacher_accounts(): void
    {
        $this->seed(RoleSeeder::class);
        $this->seed(DemoAccountSeeder::class);
        $this->seed(CompletedCourseDemoSeeder::class);

        $course = Course::query()->where('slug', 'completed-demo-course')->firstOrFail();

        $this->assertDatabaseMissing('roles', ['code' => 'teacher']);
        $this->assertDatabaseMissing('users', ['role' => 'teacher']);
        $this->assertNotNull($course->teacher_profile_id);
        $this->assertSame('Nguyễn Minh Anh', $course->teacherProfile?->name);
        $this->assertSame(
            'Người biên soạn chương trình học SEONGON giàu kinh nghiệm triển khai chiến lược SEO cho doanh nghiệp.',
            $course->teacherProfile?->bio,
        );
    }

    public function test_upgrade_backfills_course_profiles_and_removes_legacy_teacher_schema(): void
    {
        if (! Schema::hasTable('instructors')) {
            Schema::create('instructors', function (Blueprint $table): void {
                $table->id();
                $table->string('name')->unique();
                $table->text('bio')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('courses', 'instructor_id')) {
            Schema::table('courses', function (Blueprint $table): void {
                $table->foreignId('instructor_id')->nullable()->constrained('instructors')->restrictOnDelete();
            });
        }

        $legacyInstructorId = DB::table('instructors')->insertGetId([
            'name' => 'Nguyễn Minh Anh',
            'bio' => 'Tiểu sử từ danh mục cũ.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $category = Category::factory()->create();
        $linkedCourse = Course::factory()->create([
            'category_id' => $category->id,
            'teacher_profile_id' => null,
            'instructor_id' => $legacyInstructorId,
            'instructor_name' => 'Nguyễn Minh Anh',
            'instructor_bio' => 'Tiểu sử từ khóa học.',
        ]);
        $textOnlyCourse = Course::factory()->create([
            'category_id' => $category->id,
            'teacher_profile_id' => null,
            'instructor_id' => null,
            'instructor_name' => 'Lê Thu Hà',
            'instructor_bio' => 'Chuyên gia Google Ads.',
        ]);

        $teacherRole = Role::query()->firstOrCreate(
            ['code' => 'teacher'],
            ['name' => 'Giảng viên', 'description' => 'Legacy login role'],
        );
        DB::table('users')->insert([
            'name' => 'Legacy Teacher',
            'email' => 'legacy-teacher@example.test',
            'password' => Hash::make('password'),
            'role' => 'teacher',
            'role_id' => $teacherRole->id,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $migrationPath = database_path('migrations/2026_09_14_000001_canonicalize_external_teacher_profiles.php');
        $this->assertFileExists($migrationPath);
        $migration = require $migrationPath;
        $migration->up();

        $this->assertFalse(Schema::hasTable('instructors'));
        $this->assertFalse(Schema::hasColumn('courses', 'instructor_id'));
        $this->assertDatabaseMissing('roles', ['code' => 'teacher']);
        $this->assertDatabaseMissing('users', ['email' => 'legacy-teacher@example.test']);

        $linkedProfile = TeacherProfile::query()->where('name', 'Nguyễn Minh Anh')->firstOrFail();
        $textProfile = TeacherProfile::query()->where('name', 'Lê Thu Hà')->firstOrFail();
        $this->assertSame($linkedProfile->id, $linkedCourse->fresh()->teacher_profile_id);
        $this->assertSame('Tiểu sử từ danh mục cũ.', $linkedProfile->bio);
        $this->assertSame($textProfile->id, $textOnlyCourse->fresh()->teacher_profile_id);
        $this->assertSame('Chuyên gia Google Ads.', $textProfile->bio);
    }

    public function test_upgrade_stops_before_schema_changes_when_teacher_has_protected_history(): void
    {
        $teacherRole = Role::query()->create([
            'code' => 'teacher',
            'name' => 'Legacy Teacher',
        ]);
        $teacherId = DB::table('users')->insertGetId([
            'name' => 'Historical Teacher',
            'email' => 'historical-teacher@example.test',
            'password' => Hash::make('password'),
            'role' => 'teacher',
            'role_id' => $teacherRole->id,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_records')->insert([
            'user_id' => $teacherId,
            'old_status' => 'active',
            'new_status' => 'locked',
            'reason' => 'Historical status transition',
            'created_at' => now(),
        ]);
        Schema::create('instructors', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
            $table->text('bio')->nullable();
            $table->timestamps();
        });

        $migration = require database_path('migrations/2026_09_14_000001_canonicalize_external_teacher_profiles.php');

        try {
            $migration->up();
            $this->fail('Migration must not delete historical teacher data.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('teacher users have historical dependencies', $exception->getMessage());
        }

        $this->assertTrue(Schema::hasTable('instructors'));
        $this->assertDatabaseHas('users', ['id' => $teacherId, 'role' => 'teacher']);
        $this->assertDatabaseHas('user_records', ['user_id' => $teacherId]);
    }

    public function test_upgrade_preserves_a_course_already_linked_to_a_teacher_profile(): void
    {
        $profile = TeacherProfile::query()->create([
            'name' => 'Nguyễn Minh Anh',
            'bio' => 'Canonical biography',
        ]);
        $course = Course::factory()->create([
            'teacher_profile_id' => $profile->id,
            'instructor_name' => 'Outdated snapshot',
        ]);

        $migration = require database_path('migrations/2026_09_14_000001_canonicalize_external_teacher_profiles.php');
        $migration->up();

        $this->assertSame($profile->id, $course->fresh()->teacher_profile_id);
        $this->assertDatabaseCount('teacher_profiles', 1);
    }
}
