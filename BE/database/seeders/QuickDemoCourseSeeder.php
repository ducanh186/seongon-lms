<?php

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\Category;
use App\Models\Course;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\Question;
use App\Models\TeacherProfile;
use App\Support\CuratedLessonVideo;
use App\Support\DemoCourseThumbnail;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class QuickDemoCourseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $category = Category::query()->firstOrCreate(
                ['slug' => 'completed-demo'],
                [
                    'name' => 'SEO thực chiến',
                    'description' => 'Lộ trình thực hành SEO bài bản, từ mục tiêu kinh doanh đến kế hoạch tăng trưởng organic.',
                ],
            );
            $teacher = TeacherProfile::query()->firstOrCreate(
                ['name' => 'Nguyễn Minh Anh'],
                ['bio' => 'Người biên soạn chương trình học SEONGON giàu kinh nghiệm triển khai chiến lược SEO cho doanh nghiệp.'],
            );
            $course = Course::query()->firstOrCreate(
                ['slug' => Course::QUICK_DEMO_SLUG],
                [
                    'category_id' => $category->id,
                    'title' => 'Thực hành xây dựng kế hoạch SEO 90 ngày',
                    'description' => 'Khóa học giúp học viên xây dựng nền tảng SEO, xác định KPI và lập kế hoạch triển khai 90 ngày.',
                    'thumbnail' => DemoCourseThumbnail::completed(),
                    'price' => 299000,
                    'teacher_profile_id' => $teacher->id,
                    'level' => 'beginner',
                    'status' => 'published',
                ],
            );

            foreach ([
                [1, 'Xác định mục tiêu SEO và KPI', 'Liên kết mục tiêu SEO với mục tiêu kinh doanh và hệ thống chỉ số đo lường.', 300],
                [2, 'Xây dựng kế hoạch SEO 90 ngày', 'Thực hành lập lộ trình SEO ưu tiên theo nguồn lực và dữ liệu hiện có.', 420],
            ] as [$sortOrder, $title, $description, $duration]) {
                Lesson::query()->firstOrCreate(
                    ['course_id' => $course->id, 'sort_order' => $sortOrder],
                    [
                        'title' => $title,
                        'video_url' => CuratedLessonVideo::seo(),
                        'description' => $description,
                        'duration' => $duration,
                    ],
                );
            }

            $exam = Exam::query()->firstOrCreate(
                ['course_id' => $course->id],
                ['title' => 'Đánh giá cuối khóa SEO Foundation', 'pass_score' => 75, 'max_attempts' => 2],
            );
            foreach ([
                [
                    'content' => 'What progress percentage is required to complete this demo course?',
                    'correct' => '100%',
                    'wrong' => '50%',
                ],
                [
                    'content' => 'Bước đầu tiên khi lập kế hoạch SEO là gì?',
                    'correct' => 'Xác định mục tiêu kinh doanh và dữ liệu hiện có',
                    'wrong' => 'Tăng số lượng bài viết mà không xác định mục tiêu',
                ],
                [
                    'content' => 'Khi nào cần rà soát KPI trong kế hoạch SEO 90 ngày?',
                    'correct' => 'Theo mốc đã định và điều chỉnh theo dữ liệu thực',
                    'wrong' => 'Chỉ sau khi chiến dịch kết thúc',
                ],
            ] as $index => $definition) {
                $question = Question::query()->firstOrCreate(
                    ['exam_id' => $exam->id, 'content' => $definition['content']],
                    ['sort_order' => $index + 1],
                );
                Answer::query()->updateOrCreate(
                    ['question_id' => $question->id, 'content' => $definition['correct']],
                    ['is_correct' => true],
                );
                Answer::query()->updateOrCreate(
                    ['question_id' => $question->id, 'content' => $definition['wrong']],
                    ['is_correct' => false],
                );
            }

            if ($exam->questions()->count() !== 3) {
                throw new RuntimeException('The quick demo course must have exactly three questions.');
            }
        });
    }
}
