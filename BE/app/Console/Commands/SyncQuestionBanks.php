<?php

namespace App\Console\Commands;

use App\Services\QuestionBankImportService;
use App\Support\CuratedDemoCatalog;
use App\Support\QuestionBankManifest;
use App\Models\Course;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use JsonException;

class SyncQuestionBanks extends Command
{
    protected $signature = 'app:sync-question-banks
        {manifest : Path to a reviewed JSON question bank manifest}
        {--apply : Apply the validated manifest to the database}';

    protected $description = 'Validate and additively sync reviewed question banks for the original catalog';

    public function handle(QuestionBankImportService $importer): int
    {
        $path = (string) $this->argument('manifest');
        if (! is_file($path) || ! is_readable($path)) {
            $this->error('Question bank manifest is not readable.');
            return self::FAILURE;
        }

        try {
            $data = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($data) || ! isset($data['courses']) || ! is_array($data['courses'])) {
                throw new InvalidArgumentException('Expected a JSON object with a courses map.');
            }
            $expectedSlugs = [];
            foreach (CuratedDemoCatalog::tracks() as $track) {
                foreach ($track['titles'] as $index => $_title) {
                    $expectedSlugs[] = sprintf('%s-%02d', $track['slug'], $index + 1);
                }
            }
            QuestionBankManifest::validate($data['courses'], $expectedSlugs);
            if (! $this->option('apply')) {
                $this->info('Manifest valid for 100 original courses. No database changes made.');
                return self::SUCCESS;
            }

            $actualSlugs = Course::query()->pluck('slug')->sort()->values()->all();
            sort($expectedSlugs);
            if ($actualSlugs !== $expectedSlugs || ! Schema::hasColumn('questions', 'bank_key')) {
                throw new InvalidArgumentException('Expected the original 100-course catalog and the question bank migration before applying.');
            }

            $importer->import($data['courses'], $expectedSlugs);
            $this->info('Question banks synced for 100 original courses.');
            return self::SUCCESS;
        } catch (JsonException | InvalidArgumentException | ModelNotFoundException $exception) {
            $this->error($exception->getMessage());
            return self::FAILURE;
        }
    }
}
