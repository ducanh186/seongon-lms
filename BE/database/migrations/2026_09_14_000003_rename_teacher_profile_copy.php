<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('teacher_profiles')
            ->where('bio', 'like', '%Giảng viên%')
            ->update(['bio' => DB::raw("REPLACE(bio, 'Giảng viên', 'Người biên soạn chương trình học')")]);
    }

    public function down(): void
    {
        // The previous wording cannot be distinguished from admin-authored biographies.
    }
};
