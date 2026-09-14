<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $authorIds = DB::table('users')
            ->where('role', 'admin')
            ->whereIn('email', [
                'admin@seongon.vn',
                'admin2@demo.seongon.vn',
                'admin3@demo.seongon.vn',
            ])
            ->orderBy('id')
            ->pluck('id')
            ->values();

        if ($authorIds->isEmpty()) {
            $authorIds = DB::table('users')
                ->where('role', 'admin')
                ->orderBy('id')
                ->pluck('id')
                ->values();
        }

        if ($authorIds->isEmpty()) {
            return;
        }

        DB::table('news_posts')
            ->whereNull('author_id')
            ->orderBy('id')
            ->get(['id'])
            ->each(function (object $post, int $index) use ($authorIds): void {
                DB::table('news_posts')->where('id', $post->id)->update([
                    'author_id' => $authorIds[$index % $authorIds->count()],
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        // Author attribution is historical data and must be preserved on rollback.
    }
};
