<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Quiz;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuestionController extends Controller
{
    public function store(Request $request, Quiz $quiz)
    {
        $data = $this->validateData($request);

        $question = DB::transaction(function () use ($quiz, $data) {
            $question = $quiz->questions()->create(['content' => $data['content']]);
            $question->options()->createMany($data['options']);

            return $question;
        });

        return response()->json($question->load('options'), 201);
    }

    public function update(Request $request, Question $question)
    {
        $data = $this->validateData($request);

        DB::transaction(function () use ($question, $data) {
            $question->update(['content' => $data['content']]);
            $question->options()->delete();
            $question->options()->createMany($data['options']);
        });

        return response()->json($question->load('options'));
    }

    public function destroy(Question $question)
    {
        $question->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateData(Request $request): array
    {
        return $request->validate([
            'content' => ['required', 'string'],
            'options' => ['required', 'array', 'min:2'],
            'options.*.content' => ['required', 'string', 'max:500'],
            'options.*.is_correct' => ['required', 'boolean'],
        ]);
    }
}
