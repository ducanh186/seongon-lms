<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $categories = DB::table('news_posts')->select('category')->distinct()->pluck('category');

        foreach ($categories as $category) {
            DB::table('catalogs')->insertOrIgnore([
                'name' => $category,
                'description' => null,
                'created_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Existing catalog rows may have been edited after this backfill.
    }
};
