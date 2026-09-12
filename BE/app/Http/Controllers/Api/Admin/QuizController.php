<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Answer;
use App\Models\Course;
use App\Services\ProtectedDeletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class QuizController extends Controller
{
    public function __construct(private readonly ProtectedDeletionService $deletion) {}

    /**
     * Tạo hoặc cập nhật bài kiểm tra cuối khóa (mỗi khóa 1 quiz).
     */
    public function upsert(Request $request, Course $course)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'pass_score' => ['required', 'integer', 'min:1', 'max:100'],
            'max_attempts' => ['required', 'integer', 'min:1', 'max:20'],
            // UC-18 step 4: duration in minutes. Null keeps the 30-minute default.
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'closes_at' => ['nullable', 'date'],
        ]);

        if (isset($data['closes_at'])) {
            $data['closes_at'] = Carbon::parse($data['closes_at'])->utc();
        }

        $exam = $course->exam()->updateOrCreate(['course_id' => $course->id], $data);

        // load('questions.options') keeps the `options` key the frontend reads;
        // options() is an expand-phase alias for answers().
        return response()->json($exam->load('questions.options'));
    }

    /** UC-18 Delete branch: removes the exam and every related question. */
    public function destroy(Course $course)
    {
        $exam = $course->exam()->firstOrFail();
        $this->deletion->assertExamDeletable($exam);

        DB::transaction(function () use ($exam): void {
            $questionIds = $exam->questions()->pluck('id');
            Answer::query()->whereIn('question_id', $questionIds)->delete();
            $exam->questions()->delete();
            $exam->delete();
        });

        return response()->noContent();
    }
}
