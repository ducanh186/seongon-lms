<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizAttemptAnswer;
use App\Models\User;
use App\Services\CertificateService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CompletedCourseDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $student = User::query()->updateOrCreate(
                ['email' => 'student@seongon.vn'],
                [
                    'name' => 'Học viên Demo',
                    'password' => Hash::make('password'),
                    'role' => 'student',
                    'status' => 'active',
                    'email_verified_at' => now(),
                ],
            );

            $category = Category::query()->updateOrCreate(
                ['slug' => 'completed-demo'],
                [
                    'name' => 'Completed Demo',
                    'description' => 'A completed course used to demonstrate progress, quiz results, and certificates.',
                ],
            );

            $course = Course::query()->updateOrCreate(
                ['slug' => 'completed-demo-course'],
                [
                    'category_id' => $category->id,
                    'title' => 'Completed Demo Course',
                    'description' => 'A completed demo course for the student learning and certificate flow.',
                    'thumbnail' => 'https://picsum.photos/seed/seongon-completed-demo/800/450',
                    'price' => 0,
                    'instructor_name' => 'SEONGON Demo Instructor',
                    'instructor_bio' => 'Demonstrates the completed learning flow.',
                    'level' => 'beginner',
                    'status' => 'published',
                ],
            );

            $lessons = collect([
                [
                    'position' => 1,
                    'title' => 'Completed Demo Course: Introduction',
                    'video_url' => 'https://www.youtube.com/embed/aqz-KE-bpKQ',
                    'description' => 'Introduction to the completed demo course.',
                    'duration' => 300,
                ],
                [
                    'position' => 2,
                    'title' => 'Completed Demo Course: Final Practice',
                    'video_url' => 'https://www.youtube.com/embed/aqz-KE-bpKQ',
                    'description' => 'Final practice for the completed demo course.',
                    'duration' => 420,
                ],
            ])->map(fn (array $attributes): Lesson => Lesson::query()->updateOrCreate(
                ['course_id' => $course->id, 'position' => $attributes['position']],
                $attributes,
            ));

            $quiz = Quiz::query()->updateOrCreate(
                ['course_id' => $course->id],
                [
                    'title' => 'Completed Demo Course Final Quiz',
                    'pass_score' => 75,
                    'max_attempts' => 3,
                ],
            );

            $question = Question::query()->updateOrCreate(
                [
                    'quiz_id' => $quiz->id,
                    'content' => 'What progress percentage is required to complete this demo course?',
                ],
            );

            $correctOption = QuestionOption::query()->updateOrCreate(
                [
                    'question_id' => $question->id,
                    'content' => '100%',
                ],
                ['is_correct' => true],
            );

            QuestionOption::query()->updateOrCreate(
                [
                    'question_id' => $question->id,
                    'content' => '50%',
                ],
                ['is_correct' => false],
            );

            $enrollment = Enrollment::query()->updateOrCreate(
                ['user_id' => $student->id, 'course_id' => $course->id],
                [
                    'order_id' => null,
                    'enrolled_at' => now(),
                    'expires_at' => now()->addYear(),
                    'status' => 'active',
                ],
            );

            $lessons->each(fn (Lesson $lesson) => LessonProgress::query()->updateOrCreate(
                ['enrollment_id' => $enrollment->id, 'lesson_id' => $lesson->id],
                ['is_completed' => true, 'completed_at' => now()],
            ));

            $attempt = QuizAttempt::query()->updateOrCreate(
                [
                    'enrollment_id' => $enrollment->id,
                    'quiz_id' => $quiz->id,
                    'attempt_no' => 1,
                ],
                ['score' => 100, 'passed' => true, 'submitted_at' => now()],
            );

            QuizAttemptAnswer::query()->updateOrCreate(
                ['quiz_attempt_id' => $attempt->id, 'question_id' => $question->id],
                ['selected_option_id' => $correctOption->id, 'is_correct' => true],
            );

            app(CertificateService::class)->issueForEnrollment($enrollment);
        });
    }
}
