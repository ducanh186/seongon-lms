# Generated Demo Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay catalog cũ bằng 100 khóa học SEO/Ads/Content, giữ 16 học viên hiện có, thêm 100 học viên demo và cung cấp README cho non-developer.

**Architecture:** Một `GeneratedDemoCatalogSeeder` chịu trách nhiệm duy nhất về dữ liệu catalog và 100 tài khoản demo; một Artisan command có cờ `--force` gọi seeder để thay dữ liệu runtime an toàn trong transaction. `DatabaseSeeder` tạo 16 học viên nền cho fresh install rồi gọi cùng seeder, bảo đảm fresh Docker cũng có tổng 116 học viên.

**Tech Stack:** PHP 8.3, Laravel 12, Eloquent, MySQL 8, SQLite in-memory cho PHPUnit/Pest, Docker Compose.

## Global Constraints

- Giữ nguyên routes, API payloads, database schema và Docker architecture.
- Không xóa users hoặc personal access tokens hiện có.
- Runtime cuối có đúng 100 courses, 116 students và phân bổ category 34/33/33.
- Tất cả dữ liệu catalog được tạo xác định, không phụ thuộc Faker ngẫu nhiên.
- Không chỉnh sửa `data/*`, Word prototype hoặc các thay đổi không liên quan.
- Mọi thao tác xóa catalog runtime phải yêu cầu `--force` và chạy trong transaction.

---

### Task 1: Khóa giao diện command phá hủy dữ liệu

**Files:**
- Create: `BE/app/Console/Commands/ReplaceDemoCatalog.php`
- Create: `BE/tests/Feature/Console/ReplaceDemoCatalogCommandTest.php`

**Interfaces:**
- Produces: Artisan command `app:replace-demo-catalog {--force}`.
- Consumes later: `Database\Seeders\GeneratedDemoCatalogSeeder::run(): void`.

- [ ] **Step 1: Viết test đỏ cho guard `--force`**

```php
<?php

namespace Tests\Feature\Console;

use App\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReplaceDemoCatalogCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_refuses_to_replace_catalog_without_force(): void
    {
        $course = Course::factory()->create(['slug' => 'legacy-course']);

        $this->artisan('app:replace-demo-catalog')
            ->expectsOutput('Catalog chưa được thay đổi. Hãy chạy lại với --force.')
            ->assertFailed();

        $this->assertModelExists($course);
    }
}
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run from `BE`: `rtk php artisan test --filter=ReplaceDemoCatalogCommandTest`

Expected: FAIL vì command `app:replace-demo-catalog` chưa tồn tại.

- [ ] **Step 3: Tạo command tối thiểu với guard**

```php
<?php

namespace App\Console\Commands;

use Database\Seeders\GeneratedDemoCatalogSeeder;
use Illuminate\Console\Command;

class ReplaceDemoCatalog extends Command
{
    protected $signature = 'app:replace-demo-catalog
        {--force : Xác nhận xóa catalog và dữ liệu học tập cũ}';

    protected $description = 'Replace the current catalog with deterministic demo learning data';

    public function handle(GeneratedDemoCatalogSeeder $seeder): int
    {
        if (! $this->option('force')) {
            $this->error('Catalog chưa được thay đổi. Hãy chạy lại với --force.');

            return self::FAILURE;
        }

        $seeder->run();
        $this->info('Đã thay catalog demo thành công.');

        return self::SUCCESS;
    }
}
```

- [ ] **Step 4: Tạo seeder rỗng tạm thời để command resolve và chạy test GREEN**

Create `BE/database/seeders/GeneratedDemoCatalogSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class GeneratedDemoCatalogSeeder extends Seeder
{
    public function run(): void
    {
    }
}
```

Run: `rtk php artisan test --filter=ReplaceDemoCatalogCommandTest`

Expected: 1 test passed.

- [ ] **Step 5: Commit command guard**

```powershell
rtk git add BE/app/Console/Commands/ReplaceDemoCatalog.php BE/database/seeders/GeneratedDemoCatalogSeeder.php BE/tests/Feature/Console/ReplaceDemoCatalogCommandTest.php
rtk git commit -m "feat: guard demo catalog replacement command"
```

### Task 2: Tạo catalog, học viên và learning data xác định

**Files:**
- Modify: `BE/database/seeders/GeneratedDemoCatalogSeeder.php`
- Modify: `BE/tests/Feature/Console/ReplaceDemoCatalogCommandTest.php`

**Interfaces:**
- Produces: `GeneratedDemoCatalogSeeder::run(): void` thay catalog trong transaction.
- Data invariants: 3 categories, 100 courses, 100 fixed demo emails, 3–8 enrollments/student.

- [ ] **Step 1: Bổ sung test đỏ cho replacement và idempotency**

Add imports for `Category`, `Enrollment`, `User`, `DB`, then add:

```php
public function test_it_replaces_catalog_and_preserves_existing_students(): void
{
    $existingStudents = User::factory()->count(2)->create();
    $legacyCourse = Course::factory()->create(['slug' => 'legacy-course']);
    Enrollment::factory()->create([
        'user_id' => $existingStudents->first()->id,
        'course_id' => $legacyCourse->id,
    ]);

    $this->artisan('app:replace-demo-catalog', ['--force' => true])
        ->expectsOutput('Đã thay catalog demo thành công.')
        ->assertSuccessful();

    $this->assertDatabaseMissing('courses', ['slug' => 'legacy-course']);
    $this->assertDatabaseCount('categories', 3);
    $this->assertDatabaseCount('courses', 100);
    $this->assertSame(34, Category::where('slug', 'seo-ai-max')->firstOrFail()->courses()->count());
    $this->assertSame(33, Category::where('slug', 'google-ads')->firstOrFail()->courses()->count());
    $this->assertSame(33, Category::where('slug', 'content-seo')->firstOrFail()->courses()->count());
    $this->assertSame(100, User::where('email', 'like', 'student%@demo.seongon.vn')->count());

    $existingStudents->each(fn (User $student) => $this->assertDatabaseHas('users', ['id' => $student->id]));

    $counts = Enrollment::query()
        ->select('user_id', DB::raw('count(*) as aggregate'))
        ->groupBy('user_id')
        ->pluck('aggregate');

    $this->assertGreaterThanOrEqual(3, $counts->min());
    $this->assertLessThanOrEqual(8, $counts->max());
}

public function test_replacement_is_idempotent_for_demo_users_and_catalog(): void
{
    User::factory()->count(2)->create();

    $this->artisan('app:replace-demo-catalog', ['--force' => true])->assertSuccessful();
    $this->artisan('app:replace-demo-catalog', ['--force' => true])->assertSuccessful();

    $this->assertDatabaseCount('courses', 100);
    $this->assertSame(100, User::where('email', 'like', 'student%@demo.seongon.vn')->count());
}
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `rtk php artisan test --filter=ReplaceDemoCatalogCommandTest`

Expected: FAIL vì seeder rỗng không tạo 100 courses.

- [ ] **Step 3: Cài đặt constants và transaction trong seeder**

The seeder defines exactly these three tracks:

```php
private const TRACKS = [
    [
        'slug' => 'seo-ai-max',
        'name' => 'SEO AI Max',
        'count' => 34,
        'description' => 'Khóa học tối ưu hóa công cụ tìm kiếm (SEO) ứng dụng các công cụ AI để tăng tốc độ và hiệu suất làm việc.',
        'topics' => ['Nghiên cứu từ khóa bằng AI', 'Technical SEO với AI', 'SEO Onpage tự động', 'Phân tích đối thủ', 'Xây dựng topical map'],
    ],
    [
        'slug' => 'google-ads',
        'name' => 'Google Ads',
        'count' => 33,
        'description' => 'Khóa học thực chiến về thiết lập, tối ưu và quản lý chiến dịch quảng cáo trên nền tảng Google.',
        'topics' => ['Search Ads thực chiến', 'Performance Max', 'Tối ưu chuyển đổi', 'Đo lường với GA4', 'Quản lý ngân sách'],
    ],
    [
        'slug' => 'content-seo',
        'name' => 'Content SEO',
        'count' => 33,
        'description' => 'Khóa học định hướng và kỹ năng viết nội dung chuẩn SEO, tối ưu trải nghiệm người dùng và thuật toán tìm kiếm.',
        'topics' => ['Search Intent', 'Content Brief', 'Viết bài chuẩn SEO', 'Content Audit', 'Entity và Semantic SEO'],
    ],
];

private const LESSON_TITLES = [
    'Tổng quan và mục tiêu',
    'Quy trình thực hành từng bước',
    'Phân tích dữ liệu và tối ưu',
    'Bài tập ứng dụng thực tế',
];

private const INSTRUCTORS = ['Nguyễn Minh Anh', 'Trần Hoàng Nam', 'Lê Thu Hà', 'Phạm Đức Long'];

public function run(): void
{
    DB::transaction(function (): void {
        Course::query()->delete();
        Category::query()->delete();

        $students = $this->createDemoStudents();
        $courses = $this->createCourses();
        $this->createLearningData(User::where('role', 'student')->orderBy('id')->get(), $courses);

        throw_unless($courses->count() === 100, RuntimeException::class, 'Expected exactly 100 generated courses.');
        throw_unless($students->count() === 100, RuntimeException::class, 'Expected exactly 100 generated demo students.');
    });
}
```

Required imports are `Category`, `Course`, `Enrollment`, `Lesson`, `LessonProgress`, `Order`, `Question`, `QuestionOption`, `Quiz`, `Review`, `User`, `Collection`, `DB`, `Hash`, and `RuntimeException`.

- [ ] **Step 4: Cài đặt 100 demo users xác định**

```php
private function createDemoStudents(): Collection
{
    return collect(range(1, 100))->map(function (int $number): User {
        $email = sprintf('student%03d@demo.seongon.vn', $number);
        $student = User::firstOrNew(['email' => $email]);
        $student->forceFill([
            'name' => sprintf('Học viên Demo %03d', $number),
            'password' => Hash::make('password'),
            'role' => 'student',
            'status' => 'active',
            'email_verified_at' => now(),
        ])->save();

        return $student;
    });
}
```

- [ ] **Step 5: Cài đặt courses, lesson và quiz**

`createCourses(): Collection` iterates `TRACKS`, creates category by exact slug, and for each course number creates:

```php
$topic = $track['topics'][($number - 1) % count($track['topics'])];
$course = Course::create([
    'category_id' => $category->id,
    'title' => sprintf('%s %02d: %s', $track['name'], $number, $topic),
    'slug' => sprintf('%s-%02d', $track['slug'], $number),
    'description' => $track['description'].' Chương trình gồm bài học nền tảng, quy trình thực hành và bài tập ứng dụng.',
    'thumbnail' => sprintf('https://picsum.photos/seed/seongon-%s-%02d/800/450', $track['slug'], $number),
    'price' => [299000, 399000, 499000, 599000][($number - 1) % 4],
    'instructor_name' => self::INSTRUCTORS[($number - 1) % count(self::INSTRUCTORS)],
    'instructor_bio' => 'Giảng viên thực chiến của SEONGON với kinh nghiệm triển khai dự án Digital Marketing.',
    'level' => ['beginner', 'intermediate', 'advanced'][($number - 1) % 3],
    'status' => 'published',
]);
```

For each course, create four lessons from `LESSON_TITLES`, one quiz (`pass_score=75`, `max_attempts=3`), three questions and four options per question. Option index 0 is correct. Return a collection of all 100 course models with lessons loaded.

- [ ] **Step 6: Cài đặt orders, enrollments, progress và reviews**

`createLearningData(Collection $students, Collection $courses): void` uses deterministic allocation:

```php
foreach ($students->values() as $studentIndex => $student) {
    $enrollmentCount = 3 + ($studentIndex % 6);

    for ($slot = 0; $slot < $enrollmentCount; $slot++) {
        $course = $courses[($studentIndex * 7 + $slot * 13) % $courses->count()];
        $order = Order::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'amount' => $course->price,
            'status' => 'paid',
            'payment_method' => 'mock',
            'transaction_ref' => sprintf('DEMO-%03d-%03d', $studentIndex + 1, $slot + 1),
            'paid_at' => now()->subDays(($studentIndex + $slot) % 30),
        ]);
        $enrollment = Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'order_id' => $order->id,
            'enrolled_at' => $order->paid_at,
            'expires_at' => now()->addYear(),
            'status' => 'active',
        ]);

        $completedLessons = ($studentIndex + $slot) % 5;
        foreach ($course->lessons->take($completedLessons) as $lesson) {
            LessonProgress::create([
                'enrollment_id' => $enrollment->id,
                'lesson_id' => $lesson->id,
                'is_completed' => true,
                'completed_at' => now()->subDays($slot),
            ]);
        }

        if ($slot === 0) {
            Review::create([
                'user_id' => $student->id,
                'course_id' => $course->id,
                'rating' => 4 + ($studentIndex % 2),
                'comment' => 'Nội dung rõ ràng, có ví dụ thực tế và dễ áp dụng vào công việc.',
                'status' => 'visible',
            ]);
        }
    }
}
```

- [ ] **Step 7: Chạy focused test GREEN và full backend regression**

Run:

```powershell
rtk php artisan test --filter=ReplaceDemoCatalogCommandTest
rtk php artisan test --testdox
```

Expected: focused tests pass; existing 40 tests plus new tests pass with zero failures.

- [ ] **Step 8: Commit deterministic catalog**

```powershell
rtk git add BE/database/seeders/GeneratedDemoCatalogSeeder.php BE/tests/Feature/Console/ReplaceDemoCatalogCommandTest.php
rtk git commit -m "feat: generate deterministic LMS demo catalog"
```

### Task 3: Đồng bộ fresh install với 116 học viên

**Files:**
- Modify: `BE/database/seeders/DatabaseSeeder.php`
- Modify: `BE/tests/Feature/Console/SeedDemoOnceCommandTest.php`

**Interfaces:**
- Consumes: `GeneratedDemoCatalogSeeder` from Task 2.
- Produces: fresh database with one admin, 16 base students and 100 generated students.

- [ ] **Step 1: Mở rộng test seed-once**

In `test_it_seeds_demo_data_when_users_table_is_empty`, add:

```php
$this->assertSame(116, User::where('role', 'student')->count());
$this->assertDatabaseCount('courses', 100);
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `rtk php artisan test --filter=SeedDemoOnceCommandTest`

Expected: FAIL because current `DatabaseSeeder` creates one student and 12 courses.

- [ ] **Step 3: Thay phần catalog ngẫu nhiên trong DatabaseSeeder**

Keep deterministic admin `admin@seongon.vn` and student `student@seongon.vn`. Add 15 base learners:

```php
foreach (range(1, 15) as $number) {
    User::factory()->create([
        'name' => sprintf('Học viên SEONGON %02d', $number),
        'email' => sprintf('learner%02d@seongon.vn', $number),
    ]);
}

$this->call(GeneratedDemoCatalogSeeder::class);
```

Remove old category/course/lesson/quiz/review/order/enrollment factory logic and its unused imports.

- [ ] **Step 4: Chạy tests GREEN**

Run:

```powershell
rtk php artisan test --filter=SeedDemoOnceCommandTest
rtk php artisan test --testdox
```

Expected: all backend tests pass.

- [ ] **Step 5: Commit fresh seed integration**

```powershell
rtk git add BE/database/seeders/DatabaseSeeder.php BE/tests/Feature/Console/SeedDemoOnceCommandTest.php
rtk git commit -m "feat: seed complete demo learning dataset"
```

### Task 4: README cho non-developer

**Files:**
- Modify: `README.md`

**Interfaces:**
- Documents: Docker Desktop flow, demo accounts, destructive replacement command, status/stop/troubleshooting.

- [ ] **Step 1: Viết README theo cấu trúc cố định**

The README must include these headings and exact commands:

```markdown
# SEONGON LMS — Hướng dẫn sử dụng bản demo

## 1. Bạn cần chuẩn bị gì?
Docker Desktop trên Windows và thư mục source code này.

## 2. Khởi động ứng dụng
1. Mở Docker Desktop và đợi trạng thái Engine running.
2. Mở PowerShell tại thư mục dự án.
3. Chạy `docker compose --env-file Infra/.env -f Infra/docker-compose.yml up -d --build`.
4. Mở http://localhost.

## 3. Tài khoản demo
- Admin: `admin@seongon.vn` / `password`
- Học viên chính: `student@seongon.vn` / `password`
- Học viên tạo thêm: `student001@demo.seongon.vn` đến `student100@demo.seongon.vn` / `password`

## 4. Bộ dữ liệu có gì?
100 courses, 116 students, 3 course groups and 3–8 enrollments per student.

## 5. Tạo lại 100 khóa học
Warn that the command deletes current catalog learning history, then provide:
`docker compose --env-file Infra/.env -f Infra/docker-compose.yml exec -T app php artisan app:replace-demo-catalog --force`

## 6. Kiểm tra và dừng ứng dụng
Provide `docker compose ... ps`, `docker compose ... logs --tail=100`, and `docker compose ... down`.

## 7. Xử lý lỗi thường gặp
Cover Docker not running, port 80 occupied, unhealthy container, and browser cache.
```

Keep the three course descriptions exactly as approved in the design doc. Explain “container” in simple language on first use.

- [ ] **Step 2: Kiểm tra README hoàn chỉnh và không có command Bash-only**

Run a content scan confirming required headings, `localhost`, three account patterns and `--force` are present; confirm there are no unfinished markers, heredoc, `curl` or `wget`.

- [ ] **Step 3: Commit README**

```powershell
rtk git add README.md
rtk git commit -m "docs: add non-developer Docker demo guide"
```

### Task 5: Áp dụng runtime Docker và verification

**Files:**
- No source file changes expected.

**Interfaces:**
- Runs the public command and proves runtime invariants through read-only queries and HTTP smoke tests.

- [ ] **Step 1: Chạy full source verification**

```powershell
Set-Location "D:\CODE\seongon-lms\BE"
rtk php artisan test --testdox
Set-Location "D:\CODE\seongon-lms\FE\DEMO"
rtk npm.cmd test -- --reporter=dot
rtk npm.cmd run build
```

Expected: backend and FE tests pass; Vite build exits 0.

- [ ] **Step 2: Rebuild Docker**

```powershell
Set-Location "D:\CODE\seongon-lms"
rtk docker compose --env-file Infra/.env -f Infra/docker-compose.yml up -d --build
rtk docker compose --env-file Infra/.env -f Infra/docker-compose.yml ps
```

Expected: mysql, app and nginx are healthy.

- [ ] **Step 3: Thay catalog runtime**

```powershell
rtk docker compose --env-file Infra/.env -f Infra/docker-compose.yml exec -T app php artisan app:replace-demo-catalog --force
```

Expected output includes `Đã thay catalog demo thành công.`

- [ ] **Step 4: Kiểm tra database runtime**

Use a read-only Artisan query and assert:

```text
students=116
demo_students=100
courses=100
categories=3
seo_ai_max=34
google_ads=33
content_seo=33
min_enrollments=3
max_enrollments=8
```

- [ ] **Step 5: HTTP smoke test**

Request through Nginx and assert status 200 for `/healthz`, `/`, `/api/v1/categories`, and `/api/v1/courses?sort=popular`. Assert API course pagination reports `meta.total=100`.

- [ ] **Step 6: Review final diff and status**

Run `rtk git diff --check`, `rtk git status --short --branch`, and confirm only requested source/docs changes plus pre-existing unrelated `data/*` and SPEC files remain.
