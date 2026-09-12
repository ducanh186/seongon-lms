<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Instructor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class InstructorMigrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * This catches a migration that creates duplicate instructors, replaces the
     * first biography for a case-insensitive duplicate, or contracts legacy fields.
     */
    public function test_it_backfills_repeated_legacy_instructors_using_the_first_non_empty_biography_in_course_id_order(): void
    {
        $this->assertTrue(Schema::hasTable('instructors'));
        $this->assertTrue(class_exists(Instructor::class));

        $migration = 'database/migrations/2026_09_12_000002_create_instructors_and_link_courses.php';
        $this->artisan('migrate:rollback', ['--path' => $migration, '--force' => true])->assertSuccessful();

        $first = Course::factory()->create([
            'instructor_name' => 'Nguyễn Minh Anh',
            'instructor_bio' => '',
        ]);
        $second = Course::factory()->create([
            'instructor_name' => 'Nguyễn Minh Anh',
            'instructor_bio' => 'Tiểu sử được giữ lại',
        ]);
        $third = Course::factory()->create([
            'instructor_name' => 'Nguyễn Minh Anh',
            'instructor_bio' => 'Tiểu sử bị bỏ qua',
        ]);
        $unnamed = Course::factory()->create([
            'instructor_name' => null,
            'instructor_bio' => 'Không tạo giảng viên',
        ]);
        $caseFirst = Course::factory()->create([
            'instructor_name' => 'Alice',
            'instructor_bio' => null,
        ]);
        $caseSecond = Course::factory()->create([
            'instructor_name' => 'alice',
            'instructor_bio' => 'First case-insensitive biography',
        ]);
        $caseThird = Course::factory()->create([
            'instructor_name' => 'Alice',
            'instructor_bio' => 'Later case-insensitive biography',
        ]);

        $this->artisan('migrate', ['--path' => $migration, '--force' => true])->assertSuccessful();

        $instructor = DB::table('instructors')->where('name', 'Nguyễn Minh Anh')->first();

        $this->assertNotNull($instructor);
        $this->assertSame('Tiểu sử được giữ lại', $instructor->bio);
        $this->assertSame(1, DB::table('instructors')->where('name', 'Nguyễn Minh Anh')->count());
        $this->assertSame($instructor->id, Course::query()->findOrFail($first->id)->instructor_id);
        $this->assertSame($instructor->id, Course::query()->findOrFail($second->id)->instructor_id);
        $this->assertSame($instructor->id, Course::query()->findOrFail($third->id)->instructor_id);
        $this->assertNull(Course::query()->findOrFail($unnamed->id)->instructor_id);
        $this->assertSame($instructor->id, Course::query()->findOrFail($first->id)->instructor->id);
        $this->assertSame('Nguyễn Minh Anh', Course::query()->findOrFail($first->id)->instructor_name);
        $this->assertSame('', Course::query()->findOrFail($first->id)->instructor_bio);
        $this->assertSame('Tiểu sử bị bỏ qua', Course::query()->findOrFail($third->id)->instructor_bio);

        $caseInsensitiveInstructors = DB::table('instructors')
            ->whereRaw('lower(name) = ?', ['alice'])
            ->get();

        $this->assertCount(1, $caseInsensitiveInstructors);
        $caseInstructor = $caseInsensitiveInstructors->first();
        $this->assertSame('First case-insensitive biography', $caseInstructor->bio);
        $this->assertSame($caseInstructor->id, Course::query()->findOrFail($caseFirst->id)->instructor_id);
        $this->assertSame($caseInstructor->id, Course::query()->findOrFail($caseSecond->id)->instructor_id);
        $this->assertSame($caseInstructor->id, Course::query()->findOrFail($caseThird->id)->instructor_id);
        $this->assertSame(
            [$caseFirst->id, $caseSecond->id, $caseThird->id],
            Instructor::query()->findOrFail($caseInstructor->id)->courses()->pluck('id')->all(),
        );

        $nullableCourse = Course::factory()->create(['instructor_id' => null]);
        $this->assertNull($nullableCourse->instructor_id);

        try {
            Instructor::query()->findOrFail($caseInstructor->id)->delete();
            $this->fail('A referenced instructor must not be deleted.');
        } catch (QueryException) {
            $this->assertDatabaseHas('instructors', ['id' => $caseInstructor->id]);
        }
    }
}
