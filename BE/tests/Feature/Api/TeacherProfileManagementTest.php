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
}
