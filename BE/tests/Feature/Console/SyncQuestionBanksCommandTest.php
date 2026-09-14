<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncQuestionBanksCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_dry_run_accepts_banks_for_the_six_featured_courses_only(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'question-bank-');
        $courses = [];
        foreach (['seo-ai-max-01', 'seo-ai-max-02', 'google-ads-01', 'google-ads-02', 'content-seo-01', 'content-seo-02'] as $slug) {
            $courses[$slug] = $this->questionsFor($slug);
        }
        file_put_contents($path, json_encode(['courses' => $courses], JSON_THROW_ON_ERROR));

        try {
            $this->artisan('app:sync-question-banks', ['manifest' => $path])
                ->expectsOutput('Manifest valid for 6 featured courses. No database changes made.')
                ->assertSuccessful();
        } finally {
            unlink($path);
        }
    }

    /** @return list<array<string, mixed>> */
    private function questionsFor(string $slug): array
    {
        return collect(range(1, 100))->map(function (int $number) use ($slug): array {
            $correctPosition = ($number - 1) % 4;

            return [
                'key' => "{$slug}.{$number}",
                'content' => "{$slug} question {$number}",
                'topic' => $slug,
                'learning_objective' => "Objective {$number}",
                'difficulty' => 'medium',
                'item_form' => 'scenario',
                'source_url' => 'https://developers.google.com/search/docs',
                'options' => collect(range(0, 3))->map(fn (int $position): array => [
                    'content' => "{$slug} question {$number} option {$position}",
                    'is_correct' => $position === $correctPosition,
                ])->all(),
            ];
        })->all();
    }
}
