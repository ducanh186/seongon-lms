<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Course;
use App\Models\TeacherProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TeacherProfileManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_teacher_profiles_with_avatars(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $avatar = $this->withToken($token)->post('/api/v1/admin/teacher-profiles/images', [
            'image' => UploadedFile::fake()->image('teacher.jpg', 300, 300),
        ]);

        $avatar->assertCreated()
            ->assertJsonPath('url', fn ($url) => str_starts_with($url, '/storage/teacher-profile-images/'));
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $avatar->json('url')));

        $profile = $this->withToken($token)->postJson('/api/v1/admin/teacher-profiles', [
            'name' => 'Nguyễn Minh Anh',
            'bio' => 'Chuyên gia SEO.',
            'avatar' => $avatar->json('url'),
        ])->assertCreated()
            ->assertJsonPath('data.avatar', $avatar->json('url'))
            ->json('data');

        $category = Category::factory()->create();
        $course = $this->withToken($token)->postJson('/api/v1/admin/courses', [
            'category_id' => $category->id,
            'title' => 'Course teacher profile',
            'price' => 299000,
            'status' => 'draft',
            'teacher_profile_id' => $profile['id'],
            'anti_cheat_enabled' => false,
        ])->assertCreated();

        $course->assertJsonPath('data.teacher_profile_id', $profile['id'])
            ->assertJsonPath('data.teacher_profile.avatar', $avatar->json('url'));
        $this->assertDatabaseHas('courses', ['id' => $course->json('data.id'), 'teacher_profile_id' => $profile['id']]);
    }

    public function test_admin_filters_courses_by_external_teacher_profile(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $category = Category::factory()->create();
        $targetProfile = TeacherProfile::query()->create(['name' => 'Nguyễn Minh Anh', 'bio' => 'SEO']);
        $otherProfile = TeacherProfile::query()->create(['name' => 'Lê Thu Hà', 'bio' => 'Ads']);
        Course::factory()->create([
            'category_id' => $category->id,
            'title' => 'Target course',
            'teacher_profile_id' => $targetProfile->id,
        ]);
        Course::factory()->create([
            'category_id' => $category->id,
            'title' => 'Other course',
            'teacher_profile_id' => $otherProfile->id,
        ]);

        $this->withToken($token)
            ->getJson("/api/v1/admin/courses?teacher_profile_id={$targetProfile->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Target course');
    }

    public function test_course_teacher_data_is_read_only_and_derived_from_profile(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;
        $category = Category::factory()->create();
        $profile = TeacherProfile::query()->create([
            'name' => 'Nguyễn Minh Anh',
            'bio' => 'Tiểu sử chuẩn.',
            'avatar' => '/storage/teacher-profile-images/minh-anh.jpg',
        ]);

        $this->withToken($token)->postJson('/api/v1/admin/courses', [
            'category_id' => $category->id,
            'title' => 'Manual teacher data is forbidden',
            'price' => 299000,
            'status' => 'draft',
            'teacher_profile_id' => $profile->id,
            'instructor_name' => 'Tên nhập tay',
        ])->assertUnprocessable()->assertJsonValidationErrors('instructor_name');

        $course = Course::factory()->create([
            'category_id' => $category->id,
            'slug' => 'relationship-derived-teacher',
            'status' => 'published',
            'teacher_profile_id' => $profile->id,
            'instructor_name' => 'Tên snapshot sai',
            'instructor_bio' => 'Tiểu sử snapshot sai',
        ]);

        $this->getJson("/api/v1/courses/{$course->slug}")
            ->assertOk()
            ->assertJsonPath('data.instructor_name', 'Nguyễn Minh Anh')
            ->assertJsonPath('data.instructor_bio', 'Tiểu sử chuẩn.')
            ->assertJsonPath('data.teacher_profile.avatar', '/storage/teacher-profile-images/minh-anh.jpg');
    }

    public function test_legacy_teacher_bio_uses_current_wording_in_admin_and_public_responses(): void
    {
        $profile = TeacherProfile::query()->create([
            'name' => 'Nguyễn Minh Anh',
            'bio' => 'Giảng viên thực chiến về SEO.',
        ]);
        $course = Course::factory()->create([
            'slug' => 'legacy-teacher-copy',
            'status' => 'published',
            'teacher_profile_id' => $profile->id,
        ]);
        $expectedBio = 'Người biên soạn chương trình học thực chiến về SEO.';

        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/teacher-profiles')
            ->assertOk()
            ->assertJsonPath('data.0.bio', $expectedBio);
        $this->getJson("/api/v1/courses/{$course->slug}")
            ->assertOk()
            ->assertJsonPath('data.instructor_bio', $expectedBio)
            ->assertJsonPath('data.teacher_profile.bio', $expectedBio);
    }

    public function test_teacher_is_not_an_assignable_user_role(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->create();
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->patchJson("/api/v1/admin/users/{$student->id}/role", ['role' => 'teacher'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }
}
