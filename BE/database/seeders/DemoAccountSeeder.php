<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoAccountSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['email' => 'admin2@demo.seongon.vn', 'name' => 'SEONGON Admin 2', 'role' => 'admin', 'status' => 'active'],
            ['email' => 'admin3@demo.seongon.vn', 'name' => 'SEONGON Admin 3', 'role' => 'admin', 'status' => 'active'],
            ['email' => 'teacher@demo.seongon.vn', 'name' => 'Nguyễn Minh Anh', 'role' => 'teacher', 'status' => 'active'],
            ['email' => 'locked@demo.seongon.vn', 'name' => 'Tài khoản đã khóa', 'role' => 'student', 'status' => 'locked'],
        ];

        foreach ($accounts as $account) {
            $role = Role::query()->where('code', $account['role'])->firstOrFail();
            $user = User::query()->firstOrNew(['email' => $account['email']]);
            $user->name = $account['name'];
            $user->role = $role->code;
            $user->role_id = $role->id;
            $user->status = $account['status'];
            if (! $user->exists) {
                $user->password = Hash::make('password');
                $user->email_verified_at = now();
            }
            $user->save();

            if ($account['status'] === 'locked' && ! $user->statusRecords()->exists()) {
                $user->statusRecords()->create([
                    'old_status' => 'active',
                    'new_status' => 'locked',
                    'reason' => '[Demo] Tài khoản bị khóa để kiểm tra luồng quản trị.',
                ]);
            }
        }
    }
}
