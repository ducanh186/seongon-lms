<?php

namespace Tests\Feature;

use App\Models\TeacherProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherProfileCopyMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_renames_legacy_teacher_wording_in_existing_profile_biographies(): void
    {
        $profile = TeacherProfile::query()->create([
            'name' => 'Nguyễn Minh Anh',
            'bio' => 'Giảng viên thực chiến của SEONGON.',
        ]);

        $migration = require database_path('migrations/2026_09_14_000003_rename_teacher_profile_copy.php');
        $migration->up();

        $this->assertSame(
            'Người biên soạn chương trình học thực chiến của SEONGON.',
            $profile->fresh()->bio,
        );

        $migration->down();

        $this->assertSame(
            'Người biên soạn chương trình học thực chiến của SEONGON.',
            $profile->fresh()->bio,
        );
    }

    public function test_rollback_does_not_rewrite_a_biography_that_already_used_the_new_wording(): void
    {
        $profile = TeacherProfile::query()->create([
            'name' => 'Lê Thu Hà',
            'bio' => 'Người biên soạn chương trình học SEO.',
        ]);

        $migration = require database_path('migrations/2026_09_14_000003_rename_teacher_profile_copy.php');
        $migration->down();

        $this->assertSame('Người biên soạn chương trình học SEO.', $profile->fresh()->bio);
    }
}
