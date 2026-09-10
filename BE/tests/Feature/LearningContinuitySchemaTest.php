<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LearningContinuitySchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_playback_columns_exist_on_authoritative_and_compatibility_tables(): void
    {
        foreach (['lesson_progress', 'learning_progress'] as $table) {
            $this->assertTrue(Schema::hasColumns($table, [
                'resume_position_seconds',
                'furthest_position_seconds',
                'video_duration_seconds',
            ]), "Missing playback columns on {$table}");
        }
    }
}
