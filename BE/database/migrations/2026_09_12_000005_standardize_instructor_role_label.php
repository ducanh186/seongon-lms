<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')->where('code', 'teacher')->update([
            'name' => 'Giảng viên',
            'description' => 'Giảng viên và người quản lý nội dung bài học.',
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('roles')->where('code', 'teacher')->update([
            'name' => 'Giáo viên',
            'description' => 'Giảng viên và người quản lý nội dung bài học.',
            'updated_at' => now(),
        ]);
    }
};
