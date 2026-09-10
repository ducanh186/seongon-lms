<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attempts', function (Blueprint $table) {
            $table->integer('score')->nullable()->change();
            $table->boolean('passed')->nullable()->change();
            $table->unsignedInteger('correct_count')->nullable()->default(null)->change();
            $table->unsignedInteger('wrong_count')->nullable()->default(null)->change();
            $table->timestamp('submitted_at')->nullable()->change();
            $table->string('status', 20)->default('submitted')->after('attempt_number');
            $table->timestamp('started_at')->nullable()->after('status');
            $table->timestamp('expires_at')->nullable()->after('started_at');
            $table->timestamp('finished_at')->nullable()->after('expires_at');
            $table->index(['status', 'expires_at']);
        });

        DB::table('attempts')->update([
            'status' => 'submitted',
            'started_at' => DB::raw('created_at'),
            'finished_at' => DB::raw('submitted_at'),
        ]);
    }

    public function down(): void
    {
        Schema::table('attempts', function (Blueprint $table) {
            $table->dropIndex(['status', 'expires_at']);
            $table->dropColumn(['status', 'started_at', 'expires_at', 'finished_at']);
            $table->integer('score')->nullable(false)->change();
            $table->boolean('passed')->nullable(false)->change();
            $table->unsignedInteger('correct_count')->default(0)->nullable(false)->change();
            $table->unsignedInteger('wrong_count')->default(0)->nullable(false)->change();
            $table->timestamp('submitted_at')->nullable(false)->change();
        });
    }
};
