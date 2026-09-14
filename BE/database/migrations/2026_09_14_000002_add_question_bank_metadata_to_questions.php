<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table): void {
            $table->string('topic')->nullable()->after('content');
            $table->string('learning_objective')->nullable()->after('topic');
            $table->string('difficulty', 16)->default('medium')->after('learning_objective');
            $table->string('item_form', 32)->nullable()->after('difficulty');
            $table->string('status', 16)->default('ready')->after('item_form');
            $table->unsignedInteger('version')->default(1)->after('status');
            $table->text('source_url')->nullable()->after('version');
            $table->string('bank_key')->nullable()->after('source_url');
            $table->unique(['exam_id', 'bank_key']);
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table): void {
            $table->dropColumn([
                'topic',
                'learning_objective',
                'difficulty',
                'item_form',
                'status',
                'version',
                'source_url',
                'bank_key',
            ]);
        });
    }
};
