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
use App\Support\DemoCourseThumbnail;
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
                    'name' => 'SEO thực chiến',
                    'description' => 'Lộ trình thực hành SEO bài bản, từ mục tiêu kinh doanh đến kế hoạch tăng trưởng organic.',
                ],
            );

            $course = Course::query()->updateOrCreate(
                ['slug' => 'completed-demo-course'],
                [
                    'category_id' => $category->id,
                    'title' => 'Thực hành xây dựng kế hoạch SEO 90 ngày',
                    'description' => 'Khóa học giúp học viên xây dựng nền tảng SEO, xác định KPI và lập kế hoạch triển khai 90 ngày.',
                    'thumbnail' => DemoCourseThumbnail::completed(),
                    'price' => 0,
                    'instructor_name' => 'Nguyễn Minh Anh',
                    'instructor_bio' => 'Giảng viên SEONGON giàu kinh nghiệm triển khai chiến lược SEO cho doanh nghiệp.',
                    'level' => 'beginner',
                    'status' => 'published',
                ],
            );

            $lessons = collect([
                [
                    'position' => 1,
                    'title' => 'Xác định mục tiêu SEO và KPI',
                    'video_url' => 'https://www.youtube.com/embed/aqz-KE-bpKQ',
                    'description' => 'Liên kết mục tiêu SEO với mục tiêu kinh doanh và hệ thống chỉ số đo lường.',
                    'duration' => 300,
                ],
                [
                    'position' => 2,
                    'title' => 'Xây dựng kế hoạch SEO 90 ngày',
                    'video_url' => 'https://www.youtube.com/embed/aqz-KE-bpKQ',
                    'description' => 'Thực hành lập lộ trình SEO ưu tiên theo nguồn lực và dữ liệu hiện có.',
                    'duration' => 420,
                ],
            ])->map(fn (array $attributes): Lesson => Lesson::query()->updateOrCreate(
                ['course_id' => $course->id, 'position' => $attributes['position']],
                $attributes,
            ));

            $quiz = Quiz::query()->updateOrCreate(
                ['course_id' => $course->id],
                [
                    'title' => 'Đánh giá cuối khóa SEO Foundation',
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
