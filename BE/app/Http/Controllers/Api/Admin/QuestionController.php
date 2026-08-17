<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminQuestionIndexResource;
use App\Models\Exam;
use App\Models\Question;
use App\Services\LearningOperationsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuestionController extends Controller
{
    public function __construct(private readonly LearningOperationsService $operations) {}

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
