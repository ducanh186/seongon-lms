<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * P0 step D3 — approved ERD names the table Answers. Columns already match
 * (question_id, content, is_correct), so this is a pure rename.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('question_options', 'answers');
    }

    public function down(): void
    {
        Schema::rename('answers', 'question_options');
    }
};
