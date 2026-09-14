<?php

namespace Tests\Unit;

use App\Support\QuestionBankManifest;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class QuestionBankManifestTest extends TestCase
{
    public function test_it_rejects_repeated_questions_even_when_keys_are_different(): void
    {
        $item = $this->item();
        $items = [];
        foreach (range(1, 100) as $number) {
            $items[] = [...$item, 'key' => "item-{$number}"];
        }

        $this->expectException(InvalidArgumentException::class);
        QuestionBankManifest::validate(['seo-ai-max-01' => $items], ['seo-ai-max-01']);
    }

    public function test_it_rejects_missing_courses(): void
    {
        $items = [];
        foreach (range(1, 100) as $number) {
            $items[] = [...$this->item(), 'key' => "item-{$number}", 'content' => "Question {$number}?"];
        }

        $this->expectException(InvalidArgumentException::class);
        QuestionBankManifest::validate(['seo-ai-max-01' => $items], ['seo-ai-max-01', 'seo-ai-max-02']);
    }

    public function test_it_rejects_non_official_sources(): void
    {
        $items = [];
        foreach (range(1, 100) as $number) {
            $items[] = [...$this->item(),
                'key' => "item-{$number}",
                'content' => "Question {$number}?",
                'source_url' => 'https://example.com/unsourced',
            ];
        }

        $this->expectException(InvalidArgumentException::class);
        QuestionBankManifest::validate(['seo-ai-max-01' => $items], ['seo-ai-max-01']);
    }

    private function item(): array
    {
        return [
            'key' => 'sample',
            'content' => 'What is the correct step?',
            'topic' => 'Indexing',
            'learning_objective' => 'Understand indexing',
            'difficulty' => 'medium',
            'item_form' => 'application',
            'source_url' => 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
            'options' => [
                ['content' => 'Check crawl access', 'is_correct' => true],
                ['content' => 'Ignore crawl access', 'is_correct' => false],
            ],
        ];
    }
}
