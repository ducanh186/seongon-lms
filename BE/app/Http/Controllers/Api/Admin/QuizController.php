<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    /**
     * Tạo hoặc cập nhật bài kiểm tra cuối khóa (mỗi khóa 1 quiz).
     */
    public function upsert(Request $request, Course $course)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'pass_score' => ['required', 'integer', 'min:1', 'max:100'],
            'max_attempts' => ['required', 'integer', 'min:1', 'max:20'],
        ]);

        $exam = $course->exam()->updateOrCreate(['course_id' => $course->id], $data);

        // load('questions.options') keeps the `options` key the frontend reads;
        // options() is an expand-phase alias for answers().
        return response()->json($exam->load('questions.options'));
    }
}
