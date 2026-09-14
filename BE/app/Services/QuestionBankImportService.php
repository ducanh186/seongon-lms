<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Question;
use App\Support\QuestionBankManifest;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class QuestionBankImportService
{
    /** @param array<string, mixed> $courses @param list<string> $expectedSlugs */
    public function import(array $courses, array $expectedSlugs): void
    {
        QuestionBankManifest::validate($courses, $expectedSlugs);

        DB::transaction(function () use ($courses): void {
            foreach ($courses as $slug => $definitions) {
                $course = Course::query()->where('slug', $slug)->firstOrFail();
                $exam = $course->exam()->lockForUpdate()->firstOrFail();
                $keys = [];

                foreach ($definitions as $position => $definition) {
                    $keys[] = $definition['key'];
                    $question = Question::query()
                        ->where('exam_id', $exam->id)
                        ->where('bank_key', $definition['key'])
                        ->with('answers')
                        ->first();

                    if ($question) {
                        $storedOptions = $question->answers->map(fn ($answer): array => [
                            'content' => $answer->content,
                            'is_correct' => (bool) $answer->is_correct,
                        ])->all();
                        if ($question->content !== $definition['content']
                            || $question->topic !== $definition['topic']
                            || $question->learning_objective !== $definition['learning_objective']
                            || $question->difficulty !== $definition['difficulty']
                            || $question->item_form !== $definition['item_form']
                            || $question->source_url !== $definition['source_url']
                            || $storedOptions !== $definition['options']) {
                            throw new InvalidArgumentException("{$slug}: change the bank key when revising a question.");
                        }
                        $question->update(['status' => 'ready']);
                        continue;
                    }

                    $question = Question::query()->create([
                        'exam_id' => $exam->id,
                        'bank_key' => $definition['key'],
                        'content' => $definition['content'],
                        'topic' => $definition['topic'],
                        'learning_objective' => $definition['learning_objective'],
                        'difficulty' => $definition['difficulty'],
                        'item_form' => $definition['item_form'],
                        'status' => 'ready',
                        'version' => 1,
                        'source_url' => $definition['source_url'],
                        'sort_order' => $position + 1,
                    ]);
                    $question->answers()->createMany($definition['options']);
                }

                $exam->questions()->where('status', 'ready')
                    ->where(function ($query) use ($keys): void {
                        $query->whereNull('bank_key')->orWhereNotIn('bank_key', $keys);
                    })->update(['status' => 'retired']);

                if ($exam->questions()->where('status', 'ready')->count() < 100) {
                    throw new InvalidArgumentException("{$slug} has fewer than 100 ready questions after import.");
                }
            }
        });
    }
}
