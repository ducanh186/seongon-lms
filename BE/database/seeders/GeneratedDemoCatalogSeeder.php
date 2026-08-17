<?php

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\Category;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\LearningProgress;
use App\Models\Lesson;
use App\Models\Order;
use App\Models\Question;
use App\Models\Review;
use App\Models\User;
use App\Support\CuratedDemoCatalog;
use App\Support\CuratedLessonVideo;
use App\Support\DemoCourseThumbnail;
use App\Support\DemoStudentNames;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class GeneratedDemoCatalogSeeder extends Seeder
{
    /** @var array<string, list<string>> Kept for the legacy video-sync migration. */
    public const COURSE_VIDEO_IDS = [
        'seo-ai-max-01' => ['KjK5-L-wDVg', 'vxoMlEMtwuw', 'TPtCjy4n4cU', '_s2h7X-c2jE'],
        'seo-ai-max-14' => ['EqMjWU7vF2o', '_oU8lclN114', 'n-kxOhnSH-Q', 'HPL0O7Oe3j0'],
        'seo-ai-max-27' => ['RFlpwKQ0bEs', 'aLWQqlpwHK8', 'wTwnFcWUM3k', 'G_9-AkZch4k'],
        'content-seo-09' => ['uG1TG6z8Mz4', '40U1WlmnDFU', '5LF6SwB5jZ0', 'jJPS4M72FLg'],
        'google-ads-01' => ['16-dF2p0kKo', 'hbM3befCOv4', 'X1IrczXHbtU', 'uQDAR7Kj08c'],
    ];

    private const INSTRUCTORS = [
        'Nguyễn Minh Anh',
        'Trần Hoàng Nam',
        'Lê Thu Hà',
        'Phạm Đức Long',
    ];

    private const QUIZ_QUESTIONS = [
        [
            'content' => 'Bước đầu tiên khi triển khai một chiến dịch Digital Marketing là gì?',
            'options' => [
                'Xác định mục tiêu và dữ liệu đầu vào',
                'Tăng ngân sách ngay lập tức',
                'Sao chép toàn bộ đối thủ',
                'Bỏ qua việc đo lường',
            ],
        ],
        [
            'content' => 'Chỉ số nào giúp đánh giá kết quả sau khi tối ưu?',
            'options' => [
                'Chỉ số gắn với mục tiêu đã đặt ra',
                'Số lượng màu trên trang',
                'Số lần thay ảnh đại diện',
                'Số tab đang mở trên trình duyệt',
            ],
        ],
        [
            'content' => 'Cách cải thiện hiệu quả bền vững là gì?',
            'options' => [
                'Thử nghiệm, đo lường và cải tiến theo dữ liệu',
                'Thay đổi mọi thứ cùng một lúc',
                'Không ghi lại kết quả',
                'Chỉ dựa vào cảm tính',
            ],
        ],
    ];

    public function run(): void
    {
        DB::transaction(function (): void {
            Course::query()->delete();
            Category::query()->delete();

            $demoStudents = $this->createDemoStudents();
            $courses = $this->createCourses();
            $students = User::query()->where('role', 'student')->orderBy('id')->get();

            $this->createLearningData($students, $courses);

            throw_unless(
                $courses->count() === 100,
                RuntimeException::class,
                'Expected exactly 100 generated courses.',
            );
            throw_unless(
                $demoStudents->count() === 100,
                RuntimeException::class,
                'Expected exactly 100 generated demo students.',
            );
        });
    }

    private function createDemoStudents(): Collection
    {
        $password = Hash::make('password');

        return collect(range(1, 100))->map(function (int $number) use ($password): User {
            $email = sprintf('student%03d@demo.seongon.vn', $number);
            $student = User::query()->firstOrNew(['email' => $email]);

            $student->forceFill([
                'name' => DemoStudentNames::forNumber($number),
                'password' => $password,
                'role' => 'student',
                'status' => 'active',
                'email_verified_at' => now(),
            ])->save();

            return $student;
        });
    }

    private function createCourses(): Collection
    {
        $courses = collect();

        foreach (CuratedDemoCatalog::tracks() as $track) {
            $category = Category::query()->create([
                'name' => $track['name'],
                'slug' => $track['slug'],
                'description' => $track['description'],
            ]);

            foreach ($track['titles'] as $titleIndex => $title) {
                $number = $titleIndex + 1;
                $course = Course::query()->create([
                    'category_id' => $category->id,
                    'title' => $title,
                    'slug' => sprintf('%s-%02d', $track['slug'], $number),
                    'description' => $track['description'].' Chương trình gồm bài học nền tảng, quy trình thực hành và bài tập ứng dụng.',
                    'thumbnail' => DemoCourseThumbnail::forTrack($track['slug'], $number),
                    'price' => [299000, 399000, 499000, 599000][($number - 1) % 4],
                    'instructor_name' => self::INSTRUCTORS[($number - 1) % count(self::INSTRUCTORS)],
                    'instructor_bio' => 'Giảng viên thực chiến của SEONGON với kinh nghiệm triển khai dự án Digital Marketing.',
                    'level' => ['beginner', 'intermediate', 'advanced'][($number - 1) % 3],
                    'status' => 'published',
                ]);

                $this->createCourseContent($course, $title);
                $courses->push($course->load('lessons'));
            }
        }

        return $courses;
    }

    private function createCourseContent(Course $course, string $topic): void
    {
        foreach (CuratedDemoCatalog::lessons($topic) as $index => $lessonTitle) {
            Lesson::query()->create([
                'course_id' => $course->id,
                'title' => $lessonTitle,
                'video_url' => CuratedLessonVideo::forCourse($course->slug, $index),
                'description' => sprintf('%s — nội dung thực hành cho chủ đề %s.', $lessonTitle, $topic),
                'duration' => 600 + ($index * 180),
                'sort_order' => $index + 1,
            ]);
        }

        $exam = Exam::query()->create([
            'course_id' => $course->id,
            'title' => 'Bài kiểm tra cuối khóa',
            'pass_score' => 75,
            'max_attempts' => 3,
        ]);

        foreach (self::QUIZ_QUESTIONS as $questionData) {
            $question = Question::query()->create([
                'exam_id' => $exam->id,
                'content' => $questionData['content'],
            ]);

            foreach ($questionData['options'] as $optionIndex => $optionContent) {
                Answer::query()->create([
                    'question_id' => $question->id,
                    'content' => $optionContent,
                    'is_correct' => $optionIndex === 0,
                ]);
            }
        }
    }

    private function createLearningData(Collection $students, Collection $courses): void
    {
        foreach ($students->values() as $studentIndex => $student) {
            $enrollmentCount = 3 + ($studentIndex % 6);

            foreach (range(0, $enrollmentCount - 1) as $slot) {
                $course = $courses[($studentIndex * 7 + $slot * 13) % $courses->count()];
                $order = Order::query()->create([
                    'user_id' => $student->id,
                    'course_id' => $course->id,
                    'amount' => $course->price,
                    'status' => 'paid',
                    'payment_method' => 'card',
                    'transaction_ref' => sprintf('DEMO-%03d-%03d', $studentIndex + 1, $slot + 1),
                    'paid_at' => now()->subDays(($studentIndex + $slot) % 30),
                ]);
                $enrollment = Enrollment::query()->create([
                    'user_id' => $student->id,
                    'course_id' => $course->id,
                    'order_id' => $order->id,
                    'enrolled_at' => $order->paid_at,
                    'expires_at' => now()->addYear(),
                    'status' => 'active',
                ]);

                $completedLessons = ($studentIndex + $slot) % 5;

                foreach ($course->lessons->take($completedLessons) as $lesson) {
                    LearningProgress::query()->create([
                        'enrollment_id' => $enrollment->id,
                        'lesson_id' => $lesson->id,
                        'is_completed' => true,
                        'completed_at' => now()->subDays($slot),
                    ]);
                }

                if ($slot === 0) {
                    Review::query()->create([
                        'user_id' => $student->id,
                        'course_id' => $course->id,
                        'rating' => 4 + ($studentIndex % 2),
                        'comment' => 'Nội dung rõ ràng, có ví dụ thực tế và dễ áp dụng vào công việc.',
                        'status' => 'visible',
                    ]);
                }
            }
        }
    }
}
