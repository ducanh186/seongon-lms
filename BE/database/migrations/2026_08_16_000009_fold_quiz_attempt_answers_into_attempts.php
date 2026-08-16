<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P0 step D3 — folds quiz_attempt_answers into attempts.answers and retires the
 * table. quiz_attempt_answers is not one of the approved 15 ERD tables.
 *
 * The fold is verified before the DROP runs: on MySQL, DDL commits implicitly and
 * cannot be rolled back, so verification must gate the destructive statement.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('quiz_attempt_answers')) {
            return;
        }

        $expected = $this->foldAnswersIntoAttempts();
        $this->assertFoldIsComplete($expected);

        Schema::drop('quiz_attempt_answers');
    }

    /**
     * Irreversible: the source rows are gone once up() has run.
     */
    public function down(): void
    {
        //
    }

    /**
     * @return array<int, int> attempt id => number of answer rows folded
     */
    private function foldAnswersIntoAttempts(): array
    {
        $expected = [];

        DB::table('quiz_attempt_answers')
            ->orderBy('quiz_attempt_id')
            ->get()
            ->groupBy('quiz_attempt_id')
            ->each(function ($rows, $attemptId) use (&$expected) {
                $answers = $rows->map(fn ($row) => [
                    'question_id' => (int) $row->question_id,
                    'selected_answer_id' => $row->selected_option_id === null ? null : (int) $row->selected_option_id,
                    'is_correct' => (bool) $row->is_correct,
                ])->values()->all();

                $correct = collect($answers)->where('is_correct', true)->count();

                DB::table('attempts')->where('id', $attemptId)->update([
                    'answers' => json_encode($answers, JSON_UNESCAPED_UNICODE),
                    'correct_count' => $correct,
                    'wrong_count' => count($answers) - $correct,
                ]);

                $expected[(int) $attemptId] = count($answers);
            });

        return $expected;
    }

    /**
     * @param  array<int, int>  $expected
     */
    private function assertFoldIsComplete(array $expected): void
    {
        foreach ($expected as $attemptId => $count) {
            $stored = DB::table('attempts')->where('id', $attemptId)->value('answers');
            $decoded = $stored === null ? null : json_decode($stored, true);

            if (! is_array($decoded) || count($decoded) !== $count) {
                throw new RuntimeException(
                    "Fold incomplete for attempt {$attemptId}: expected {$count} answer(s), stored "
                    .(is_array($decoded) ? count($decoded) : 'none').'. quiz_attempt_answers was not dropped.'
                );
            }
        }
    }
};
