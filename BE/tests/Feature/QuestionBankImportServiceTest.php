<?php

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Course;
use App\Models\Exam;
use App\Models\Question;
use App\Services\QuestionBankImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuestionBankImportServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_is_additive_idempotent_and_retires_legacy_questions(): void
    {
        $course = Course::factory()->create(['slug' => 'seo-ai-max-01']);
        $exam = Exam::factory()->create(['course_id' => $course->id]);
        $legacy = Question::factory()->create(['exam_id' => $exam->id]);
        Answer::factory()->correct()->create(['question_id' => $legacy->id]);
        Answer::factory()->create(['question_id' => $legacy->id]);
        $items = [];
        foreach (range(1, 100) as $number) {
            $options = [
                ['content' => "Allow crawling in case {$number}", 'is_correct' => true],
                ['content' => "Block all crawlers in case {$number}", 'is_correct' => false],
                ['content' => "Delete the sitemap in case {$number}", 'is_correct' => false],
                ['content' => "Remove internal links in case {$number}", 'is_correct' => false],
            ];
            $correct = array_shift($options);
            array_splice($options, ($number - 1) % 4, 0, [$correct]);
            $items[] = [
                'key' => "seo-index-{$number}",
                'content' => "Which index action applies to case {$number}?",
                'topic' => 'Indexing',
                'learning_objective' => 'Choose an indexing action',
                'difficulty' => 'medium',
                'item_form' => 'application',
                'source_url' => 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
                'options' => $options,
            ];
        }
        $manifest = ['seo-ai-max-01' => $items];
        $importer = app(QuestionBankImportService::class);

        $importer->import($manifest, ['seo-ai-max-01']);
        $this->assertSame('retired', $legacy->refresh()->status);
        $this->assertSame(100, $exam->questions()->where('status', 'ready')->count());
        $this->assertSame(101, $exam->questions()->count());
        $importer->import($manifest, ['seo-ai-max-01']);
        $this->assertSame(101, $exam->questions()->count());

        $revised = $manifest;
        $revised['seo-ai-max-01'][0]['content'] = 'Revised question content';
        $this->expectException(\InvalidArgumentException::class);
        $importer->import($revised, ['seo-ai-max-01']);
    }
}
