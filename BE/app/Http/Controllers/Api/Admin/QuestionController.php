<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminQuestionIndexResource;
use App\Models\Exam;
use App\Models\Question;
use App\Services\LearningOperationsService;
use App\Services\ProtectedDeletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuestionController extends Controller
{
    public function __construct(
        private readonly LearningOperationsService $operations,
        private readonly ProtectedDeletionService $deletion,
    ) {}

    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'exam_id' => ['nullable', 'integer', 'exists:exams,id'],
        ]);

        return AdminQuestionIndexResource::collection(
            $this->operations->paginateQuestions($filters),
        );
    }

    public function store(Request $request, Exam $quiz)
    {
        $data = $this->validateData($request);

        $question = DB::transaction(function () use ($quiz, $data) {
            $question = $quiz->questions()->create(['content' => $data['content']]);
            $question->answers()->createMany($data['options']);

            return $question;
        });

        return response()->json($question->load('options'), 201);
    }

    public function update(Request $request, Question $question)
    {
        $this->deletion->assertQuestionMutable($question);
        $data = $this->validateData($request);

        DB::transaction(function () use ($question, $data) {
            $question->update(['content' => $data['content']]);
            $question->answers()->delete();
            $question->answers()->createMany($data['options']);
        });

        return response()->json($question->load('options'));
    }

    public function destroy(Question $question)
    {
        $this->deletion->assertQuestionMutable($question);
        $question->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateData(Request $request): array
    {
        $data = $request->validate([
            'content' => ['required', 'string'],
            'options' => ['required', 'array', 'min:2', 'max:4'],
            'options.*.content' => ['required', 'string', 'max:500'],
            'options.*.is_correct' => ['required', 'boolean'],
        ], [
            'options.min' => 'Mỗi câu hỏi cần ít nhất 2 phương án.',
            'options.max' => 'Mỗi câu hỏi có tối đa 4 phương án.',
        ]);

        if (collect($data['options'])->where('is_correct', true)->count() !== 1) {
            throw ValidationException::withMessages([
                'options' => ['Mỗi câu hỏi phải có đúng một đáp án đúng.'],
            ]);
        }

        return $data;
    }
}
