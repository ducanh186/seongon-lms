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

        $quiz = $course->quiz()->updateOrCreate(['course_id' => $course->id], $data);

        return response()->json($quiz->load('questions.options'));
    }
}
