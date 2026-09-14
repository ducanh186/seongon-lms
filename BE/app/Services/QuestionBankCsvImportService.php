<?php

namespace App\Services;

use App\Models\Exam;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class QuestionBankCsvImportService
{
    private const HEADERS = ['question', 'option_a', 'option_b', 'option_c', 'correct_answer'];

    /**
     * @return int Number of questions added to the exam's question bank.
     */
    public function import(Exam $exam, UploadedFile $file): int
    {
        $rows = $this->readRows($file);
        return DB::transaction(function () use ($exam, $rows): int {
            $lockedExam = Exam::query()->lockForUpdate()->findOrFail($exam->id);
            $lockedExam->questions()->delete();

            foreach ($rows as $index => $row) {
                $question = $lockedExam->questions()->create([
                    'content' => $row['question'],
                    'status' => 'ready',
                    'sort_order' => $index + 1,
                ]);
                $question->answers()->createMany($row['options']);
            }

            return count($rows);
        });
    }

    /**
     * @return list<array{question:string, options:list<array{content:string, is_correct:bool}>}>
     */
    private function readRows(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'rb');
        if ($handle === false) {
            throw ValidationException::withMessages(['file' => ['Không thể đọc file CSV.']]);
        }

        try {
            $header = fgetcsv($handle);
            $header = is_array($header)
                ? array_map(fn ($value) => trim((string) $value), $header)
                : [];
            if ($header !== []) {
                $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]) ?? $header[0];
            }
            if ($header !== self::HEADERS) {
                throw ValidationException::withMessages([
                    'file' => ['CSV phải có header: question,option_a,option_b,option_c,correct_answer.'],
                ]);
            }

            $rows = [];
            $questions = [];
            $line = 1;
            while (($values = fgetcsv($handle)) !== false) {
                $line++;
                if ($values === [null] || $values === []) {
                    continue;
                }
                if (count($values) !== count(self::HEADERS)) {
                    throw ValidationException::withMessages(['file' => ["Dòng {$line} phải có đúng 5 cột."]]);
                }

                [$question, $optionA, $optionB, $optionC, $correctAnswer] = array_map(
                    fn ($value) => trim((string) $value),
                    $values,
                );
                if ($question === '' || $optionA === '' || $optionB === '' || $optionC === '') {
                    throw ValidationException::withMessages(['file' => ["Dòng {$line} không được để trống câu hỏi hoặc đáp án."]]);
                }
                $questionKey = mb_strtolower(preg_replace('/\s+/u', ' ', $question));
                if (isset($questions[$questionKey])) {
                    throw ValidationException::withMessages(['file' => ["Dòng {$line} có câu hỏi trùng lặp."]]);
                }
                $questions[$questionKey] = true;

                $options = [$optionA, $optionB, $optionC];
                if (count(array_unique(array_map(fn ($option) => mb_strtolower($option), $options))) !== 3) {
                    throw ValidationException::withMessages(['file' => ["Dòng {$line} cần 3 đáp án khác nhau."]]);
                }
                $correctIndex = match (strtoupper($correctAnswer)) {
                    'A', '1' => 0,
                    'B', '2' => 1,
                    'C', '3' => 2,
                    default => throw ValidationException::withMessages([
                        'file' => ["Dòng {$line} có correct_answer không hợp lệ. Dùng A/B/C hoặc 1/2/3."],
                    ]),
                };
                $rows[] = [
                    'question' => $question,
                    'options' => array_map(
                        fn (string $option, int $index) => ['content' => $option, 'is_correct' => $index === $correctIndex],
                        $options,
                        array_keys($options),
                    ),
                ];
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }
}
