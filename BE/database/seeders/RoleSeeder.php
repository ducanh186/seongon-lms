<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Role codes match the values currently stored in users.role, so the column can be
     * replaced by role_id without remapping data.
     */
    public const ROLES = [
        ['code' => 'admin', 'name' => 'Quản trị viên', 'description' => 'Quản trị hệ thống và nội dung đào tạo.'],
        ['code' => 'student', 'name' => 'Học viên', 'description' => 'Người mua và tham gia khóa học.'],
    ];

    public function run(): void
    {
        foreach (self::ROLES as $role) {
            Role::query()->updateOrCreate(['code' => $role['code']], $role);
        }
    }
}
