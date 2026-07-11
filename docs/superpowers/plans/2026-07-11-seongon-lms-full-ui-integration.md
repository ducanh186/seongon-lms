# SEONGON LMS Full UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Guest, Student, and Admin React interface against the Laravel API, with a safe admin-only quiz-detail contract and automated plus local-browser verification.

**Architecture:** Preserve the React Router + MUI application and its typed `api` boundary. Add a dedicated Laravel admin course resource for quiz editing data, while public/student resources remain unchanged. Pages own their fetching/mutation state and use reusable presentation helpers for loading, empty, and error states.

**Tech Stack:** React 18, TypeScript, React Router, MUI 7, Vite, Vitest, Testing Library, Laravel 13, Sanctum, Pest/PHPUnit.

## Global Constraints

- Preserve all existing `/api/v1` route names, request field names, resource fields, and business rules.
- Only `GET /api/v1/admin/courses/{course}` gains the admin-only `data.quiz.questions.options` detail field; it may expose `is_correct` only behind `auth:sanctum` + `role:admin`.
- Public/student resources must not expose quiz answer correctness.
- Do not use `src/app/data/mockData.ts` in any API-driven route.
- Keep the existing MUI light theme, `#007E87` primary accent, and 12px card radius.
- Use tests first: a new behavior needs a focused test that fails for the missing behavior before production code is written.
- This workspace is not a Git repository. Do not run Git commands or add commit steps.

---

## File Structure

| File | Responsibility |
|---|---|
| `BE/app/Http/Resources/AdminCourseResource.php` | Serialize course detail for admins, including editable quiz/question/options data. |
| `BE/app/Http/Controllers/Api/Admin/CourseController.php` | Return `AdminCourseResource` only from admin course detail. |
| `BE/tests/Feature/Api/AdminManagementTest.php` | Prove admin quiz detail and all CRUD/reorder contracts. |
| `FE/DEMO/src/app/lib/contracts.ts` | Type every Laravel resource and admin mutation payload. |
| `FE/DEMO/src/app/lib/api.ts` | Centralize all request URLs, methods, payloads, and response types. |
| `FE/DEMO/src/app/components/AsyncState.tsx` | Shared MUI skeleton, empty state, and error/retry presentation. |
| `FE/DEMO/src/app/contexts/AuthContext.tsx` | Restore/clear a Sanctum session and keep profile state current. |
| `FE/DEMO/src/app/pages/*.tsx` | Render API-backed Guest, Student, and Admin workflows. |
| `FE/DEMO/src/app/**/*.test.tsx` | Verify behavior through rendered UI and API mocks. |

## Task 1: Admin-only quiz-detail contract

**Files:**
- Create: `BE/app/Http/Resources/AdminCourseResource.php`
- Modify: `BE/app/Http/Controllers/Api/Admin/CourseController.php:6-7,28-34`
- Modify: `BE/tests/Feature/Api/AdminManagementTest.php`

**Interfaces:**
- Consumes: an admin-loaded `Course` relation graph: `category`, `lessons`, `quiz.questions.options`.
- Produces: `GET /api/v1/admin/courses/{id}` → `{ data: CourseResourceFields & { quiz: { id, course_id, title, pass_score, max_attempts, questions: [{ id, content, options: [{ id, content, is_correct }] }] } | null } }`.

- [ ] **Step 1: Write the failing admin-detail contract test**

```php
public function test_admin_course_detail_includes_editable_quiz_data_without_changing_public_course_data(): void
{
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $quiz = Quiz::factory()->create(['course_id' => $course->id]);
    $question = Question::factory()->create(['quiz_id' => $quiz->id, 'content' => 'Cau hoi?']);
    $option = QuestionOption::factory()->correct()->create(['question_id' => $question->id, 'content' => 'Dung']);
    $token = $admin->createToken('test')->plainTextToken;

    $this->withToken($token)->getJson("/api/v1/admin/courses/{$course->id}")
        ->assertOk()
        ->assertJsonPath('data.quiz.id', $quiz->id)
        ->assertJsonPath('data.quiz.questions.0.id', $question->id)
        ->assertJsonPath('data.quiz.questions.0.options.0.is_correct', true);

    $this->getJson("/api/v1/courses/{$course->slug}")
        ->assertOk()
        ->assertJsonMissingPath('data.quiz.questions.0.options.0.is_correct');
}
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test --filter=admin_course_detail_includes_editable_quiz_data_without_changing_public_course_data
```

Expected: `data.quiz` is missing from the admin detail response.

- [ ] **Step 3: Add the dedicated resource and use it only for admin detail**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminCourseResource extends CourseResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'quiz' => $this->whenLoaded('quiz', function () {
                if ($this->quiz === null) {
                    return null;
                }

                return [
                    'id' => $this->quiz->id,
                    'course_id' => $this->quiz->course_id,
                    'title' => $this->quiz->title,
                    'pass_score' => $this->quiz->pass_score,
                    'max_attempts' => $this->quiz->max_attempts,
                    'questions' => $this->quiz->questions->map(fn ($question) => [
                        'id' => $question->id,
                        'content' => $question->content,
                        'options' => $question->options->map(fn ($option) => [
                            'id' => $option->id,
                            'content' => $option->content,
                            'is_correct' => $option->is_correct,
                        ])->values(),
                    ])->values(),
                ];
            }),
        ];
    }
}
```

```php
// BE/app/Http/Controllers/Api/Admin/CourseController.php
use App\Http\Resources\AdminCourseResource;

public function show(Course $course)
{
    $course->load(['category', 'lessons', 'quiz.questions.options'])
        ->loadCount(['lessons', 'enrollments', 'reviews']);

    return new AdminCourseResource($course);
}
```

- [ ] **Step 4: Re-run the focused test and the existing public catalog test**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test --filter='admin_course_detail_includes_editable_quiz_data_without_changing_public_course_data|guest_catalog_only_returns_published_courses_and_applies_filters'
```

Expected: both tests pass.

## Task 2: Typed frontend API boundary

**Files:**
- Modify: `FE/DEMO/src/app/lib/contracts.ts:98-146`
- Modify: `FE/DEMO/src/app/lib/api.ts:162-178`
- Modify: `FE/DEMO/src/app/lib/api.test.ts`

**Interfaces:**
- Consumes: the response defined in Task 1 and unchanged Laravel admin mutation routes.
- Produces: `ApiAdminCourse`, `ApiAdminQuiz`, `ApiAdminQuestion`, `api.reorderLessons`, `api.updateQuestion`, and `api.deleteQuestion`.

- [ ] **Step 1: Write failing API-client tests for the omitted admin routes**

```ts
it('sends lesson order and question replacement through the matching admin routes', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchMock);

  await api.reorderLessons('admin-token', 41, [7, 9]);
  await api.updateQuestion('admin-token', 18, {
    content: 'Cau hoi moi',
    options: [{ content: 'Dung', is_correct: true }, { content: 'Sai', is_correct: false }],
  });

  expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/courses\/41\/lessons\/reorder$/);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ order: [7, 9] }));
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/admin\/questions\/18$/);
  expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
});
```

- [ ] **Step 2: Run the focused client test and verify it fails because methods are missing**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test -- src/app/lib/api.test.ts
```

- [ ] **Step 3: Add exact admin contracts and methods**

```ts
export interface ApiAdminQuestionOption extends ApiQuizOption {
  is_correct: boolean;
}

export interface ApiAdminQuestion {
  id: number;
  content: string;
  options: ApiAdminQuestionOption[];
}

export interface ApiAdminQuiz {
  id: number;
  course_id: number;
  title: string;
  pass_score: number;
  max_attempts: number;
  questions: ApiAdminQuestion[];
}

export interface ApiAdminCourse extends ApiCourse {
  quiz: ApiAdminQuiz | null;
}
```

```ts
adminCourse: (token: string, courseId: number) =>
  apiRequest<{ data: ApiAdminCourse }>(`/admin/courses/${courseId}`, { token }),
reorderLessons: (token: string, courseId: number, order: number[]) =>
  apiRequest<{ data: ApiLesson[] }>(`/admin/courses/${courseId}/lessons/reorder`, {
    method: 'PATCH', token, body: { order },
  }),
updateQuestion: (token: string, questionId: number, body: { content: string; options: Array<{ content: string; is_correct: boolean }> }) =>
  apiRequest<ApiAdminQuestion>(`/admin/questions/${questionId}`, { method: 'PUT', token, body }),
deleteQuestion: (token: string, questionId: number) =>
  apiRequest<void>(`/admin/questions/${questionId}`, { method: 'DELETE', token }),
```

- [ ] **Step 4: Verify focused client tests pass and TypeScript compiles**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test -- src/app/lib/api.test.ts
npm run build
```

Expected: the API tests and Vite build exit with code 0.

## Task 3: Shared async feedback, authentication, and Guest experience

**Files:**
- Create: `FE/DEMO/src/app/components/AsyncState.tsx`
- Create: `FE/DEMO/src/app/components/AsyncState.test.tsx`
- Modify: `FE/DEMO/src/app/contexts/AuthContext.tsx`
- Modify: `FE/DEMO/src/app/contexts/AuthContext.test.tsx`
- Modify: `FE/DEMO/src/app/pages/AuthPage.tsx`
- Modify: `FE/DEMO/src/app/pages/CatalogPage.tsx`
- Modify: `FE/DEMO/src/app/pages/CoursePage.tsx`
- Modify: `FE/DEMO/src/app/pages/CatalogPage.test.tsx`
- Create: `FE/DEMO/src/app/pages/AuthPage.test.tsx`
- Create: `FE/DEMO/src/app/pages/CoursePage.test.tsx`

**Interfaces:**
- Consumes: `ApiError.fields` and public catalog/course API calls.
- Produces: shared skeleton/empty/error rendering, field-level form feedback, responsive Guest catalog/detail behavior.

- [ ] **Step 1: Write failing component tests**

```tsx
it('shows a field error returned by Laravel on the matching login input', async () => {
  vi.mocked(api.login).mockRejectedValue(new ApiError('Du lieu khong hop le.', 422, {
    email: ['Email khong dung dinh dang.'],
  }));
  render(<AuthProvider><MemoryRouter><AuthPage /></MemoryRouter></AuthProvider>);
  await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'SecurePass123!');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText('Email khong dung dinh dang.')).toBeInTheDocument();
});

it('renders the catalog empty action after its API resolves with no courses', async () => {
  vi.mocked(api.courses).mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 } });
  render(<MemoryRouter><CatalogPage /></MemoryRouter>);
  expect(await screen.findByText('Không tìm thấy khóa học phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests and verify missing field-level and shared-state behavior**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test -- src/app/pages/AuthPage.test.tsx src/app/pages/CatalogPage.test.tsx src/app/components/AsyncState.test.tsx
```

- [ ] **Step 3: Add the shared state components and wire them into pages**

```tsx
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return <Stack spacing={2} aria-label="Đang tải nội dung">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} variant="rounded" height={index === 0 ? 160 : 72} />)}</Stack>;
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return <Alert severity="info" action={action}>{title}</Alert>;
}

export function RequestError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Thử lại</Button> : undefined}>{message}</Alert>;
}
```

In `AuthPage`, retain `ApiError` in state rather than only its message and set each `TextField` `error` and `helperText` from `error?.fields.email`, `error?.fields.password`, and `error?.fields.password_confirmation`. In `CatalogPage` and `CoursePage`, replace circular initial loaders with `PageSkeleton`, render `RequestError` with a retry callback, and preserve the current MUI grid/layout.

- [ ] **Step 4: Make profile updates visible in the persisted auth state**

```ts
interface AuthContextType {
  // existing members
  refreshUser: () => Promise<ApiUser | null>;
}

refreshUser: async () => {
  if (!token) return null;
  const { data } = await api.me(token);
  setUser(data);
  return data;
},
```

Call `refreshUser()` after `api.updateProfile()` succeeds in `ProfilePage`, then add a test that the visible header/profile state shows the returned name.

- [ ] **Step 5: Verify Guest/auth tests and build**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test -- src/app/components/AsyncState.test.tsx src/app/contexts/AuthContext.test.tsx src/app/pages/AuthPage.test.tsx src/app/pages/CatalogPage.test.tsx src/app/pages/CoursePage.test.tsx
npm run build
```

## Task 4: Student purchase and learning workflow

**Files:**
- Modify: `FE/DEMO/src/app/pages/CheckoutPage.tsx`
- Modify: `FE/DEMO/src/app/pages/MyCoursesPage.tsx`
- Modify: `FE/DEMO/src/app/pages/LearnCoursePage.tsx`
- Modify: `FE/DEMO/src/app/pages/ProfilePage.tsx`
- Create: `FE/DEMO/src/app/pages/CheckoutPage.test.tsx`
- Create: `FE/DEMO/src/app/pages/MyCoursesPage.test.tsx`
- Create: `FE/DEMO/src/app/pages/LearnCoursePage.test.tsx`
- Create: `FE/DEMO/src/app/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes: the existing order, enrollment, lesson, progress, quiz, review, certificate, profile, and password routes.
- Produces: the complete order → learn → quiz → review/certificate journey with recoverable errors.

- [ ] **Step 1: Write failing student-flow tests**

```tsx
it('does not expose the quiz action until the backend progress allows it', async () => {
  vi.mocked(api.progress).mockResolvedValue({ completed: 1, total: 2, percent: 50, can_take_exam: false });
  renderLearningPage();
  expect(await screen.findByText('Hoàn thành 100% bài học để mở bài kiểm tra.')).toBeInTheDocument();
  expect(api.quiz).not.toHaveBeenCalled();
});

it('keeps a payment failure recoverable and does not navigate to My Courses', async () => {
  vi.mocked(api.payOrder).mockRejectedValue(new ApiError('Thanh toan that bai.', 422));
  renderCheckoutPage();
  await completeOrderAndChooseQr();
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận thanh toán' }));
  expect(await screen.findByText('Thanh toan that bai.')).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalledWith('/my-courses', expect.anything());
});
```

- [ ] **Step 2: Run focused tests and verify they fail for absent or incorrect state handling**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test -- src/app/pages/CheckoutPage.test.tsx src/app/pages/MyCoursesPage.test.tsx src/app/pages/LearnCoursePage.test.tsx src/app/pages/ProfilePage.test.tsx
```

- [ ] **Step 3: Implement the minimal state transitions**

- Keep order creation behind the existing explicit `Tạo đơn đăng ký` action; disable that action while awaiting `api.createOrder`.
- For payment success, keep the returned enrollment in a success notice before redirecting to `/my-courses`; for 422 keep the pending/failed order controls so the learner can retry.
- In `MyCoursesPage`, add retryable initial errors, pagination based on Laravel `meta`, an expired-course non-action state, and `PageSkeleton` while loading.
- In `LearnCoursePage`, make `refresh` stable with `useCallback`, use `Promise.all` for enrollments/lessons/progress, refresh after completing a lesson, and reset quiz answers after a result. Do not mark a lesson complete locally before `api.completeLesson` succeeds.
- Keep certificate download authenticated and revoke its object URL after click. Surface download failure with `RequestError`/`Alert`.
- In `ProfilePage`, attach 422 field errors to profile/password inputs and call `refreshUser()` after profile update.

- [ ] **Step 4: Verify focused student tests and a production build**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test -- src/app/pages/CheckoutPage.test.tsx src/app/pages/MyCoursesPage.test.tsx src/app/pages/LearnCoursePage.test.tsx src/app/pages/ProfilePage.test.tsx
npm run build
```

## Task 5: Full Admin management workspace

**Files:**
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Create: `FE/DEMO/src/app/pages/AdminPage.test.tsx`
- Modify: `FE/DEMO/src/app/lib/api.test.ts`

**Interfaces:**
- Consumes: `ApiAdminCourse` from Task 2 and every existing `/admin` Laravel route.
- Produces: create/edit/delete/reorder admin controls, with safe confirmation and fresh server state after each mutation.

- [ ] **Step 1: Write failing admin page tests**

```tsx
it('loads the selected course detail before rendering editable quiz questions', async () => {
  vi.mocked(api.adminCourse).mockResolvedValue({ data: adminCourseWithQuiz });
  renderAdminPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Nội dung' }));
  expect(await screen.findByDisplayValue('Cau hoi hien co')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Dap an dung')).toBeInTheDocument();
});

it('sends the full lesson id list after moving a lesson down', async () => {
  vi.mocked(api.adminCourse).mockResolvedValue({ data: adminCourseWithTwoLessons });
  renderAdminPage();
  await selectAdminCourse();
  await userEvent.click(screen.getByRole('button', { name: 'Di chuyển bài học 1 xuống' }));
  expect(api.reorderLessons).toHaveBeenCalledWith('admin-token', adminCourseWithTwoLessons.id, [secondLesson.id, firstLesson.id]);
});
```

- [ ] **Step 2: Run the admin test and verify it fails because existing data is not loaded/editable**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test -- src/app/pages/AdminPage.test.tsx
```

- [ ] **Step 3: Implement controlled forms by responsibility**

- Add search/status filter controls and Laravel pagination controls for Users, Courses, and Reviews.
- Convert Category and Course forms to edit-or-create forms. Populate fields from the selected record; call `updateCategory`/`saveCourse` with ID for edits and clear selection after a successful refresh.
- When an admin chooses `Nội dung`, call `api.adminCourse`, keep that `ApiAdminCourse` as the selected detail, and render editable lesson cards ordered by `position`.
- Add lesson save/edit/delete controls. Move up/down actions calculate the complete lesson ID order and call `api.reorderLessons(token, courseId, order)`; reload detail after success.
- Render the returned admin-only quiz detail. Quiz configuration calls `saveQuiz`; question create/edit sends at least two options with exactly one `is_correct: true`; delete calls `deleteQuestion`. Reload the selected course detail after every successful content mutation.
- Add confirm dialogs before delete category/course/lesson/question/review. Keep all existing Vietnamese labels, teal primary action, `Alert` notices, and mobile single-column behavior.

- [ ] **Step 4: Verify admin UI/API tests and build**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test -- src/app/pages/AdminPage.test.tsx src/app/lib/api.test.ts
npm run build
```

## Task 6: Backend contract coverage

**Files:**
- Modify: `BE/tests/Feature/Api/AdminManagementTest.php`
- Modify: `BE/tests/Feature/Api/AuthAndCatalogTest.php`
- Modify: `BE/tests/Feature/Api/StudentLearningFlowTest.php`

**Interfaces:**
- Consumes: all UI routes from Tasks 1-5.
- Produces: regression tests that prove frontend-used mutations and authorization behavior remain valid.

- [ ] **Step 1: Add failing tests for omitted mutation contracts**

```php
public function test_admin_can_update_reorder_and_delete_course_content(): void
{
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $first = Lesson::factory()->create(['course_id' => $course->id, 'position' => 1]);
    $second = Lesson::factory()->create(['course_id' => $course->id, 'position' => 2]);
    $token = $admin->createToken('test')->plainTextToken;

    $this->withToken($token)->patchJson("/api/v1/admin/courses/{$course->id}/lessons/reorder", [
        'order' => [$second->id, $first->id],
    ])->assertOk()->assertJsonPath('data.0.id', $second->id);

    $this->assertDatabaseHas('lessons', ['id' => $second->id, 'position' => 1]);
}
```

- [ ] **Step 2: Run the feature tests before changing production behavior**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test --filter='admin_course_detail_includes_editable_quiz_data_without_changing_public_course_data|admin_can_update_reorder_and_delete_course_content'
```

Expected: the quiz-detail test is red before Task 1 implementation; the reorder test must either prove current expected behavior or expose a real route/resource defect.

- [ ] **Step 3: Add the remaining frontend-consumed mutation assertions**

Add these exact cases to `AdminManagementTest`:

```php
public function test_admin_can_update_and_delete_category_course_lesson_and_question(): void
{
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();
    $course = Course::factory()->create(['category_id' => $category->id]);
    $lesson = Lesson::factory()->create(['course_id' => $course->id]);
    $quiz = Quiz::factory()->create(['course_id' => $course->id]);
    $question = Question::factory()->create(['quiz_id' => $quiz->id]);
    QuestionOption::factory()->correct()->create(['question_id' => $question->id]);
    QuestionOption::factory()->create(['question_id' => $question->id]);
    $token = $admin->createToken('test')->plainTextToken;

    $this->withToken($token)->putJson("/api/v1/admin/categories/{$category->id}", [
        'name' => 'Updated category', 'description' => 'Updated description',
    ])->assertOk()->assertJsonPath('data.name', 'Updated category');

    $this->withToken($token)->putJson("/api/v1/admin/courses/{$course->id}", [
        'category_id' => $category->id,
        'title' => 'Updated course',
        'description' => 'Updated description',
        'thumbnail' => null,
        'price' => 100000,
        'instructor_name' => 'Instructor',
        'instructor_bio' => 'Bio',
        'level' => 'beginner',
        'status' => 'draft',
    ])->assertOk()->assertJsonPath('data.title', 'Updated course');

    $this->withToken($token)->putJson("/api/v1/admin/lessons/{$lesson->id}", [
        'title' => 'Updated lesson', 'video_url' => 'https://example.test/embed',
        'description' => 'Lesson description', 'duration' => 120, 'position' => 1,
    ])->assertOk()->assertJsonPath('data.title', 'Updated lesson');

    $this->withToken($token)->putJson("/api/v1/admin/questions/{$question->id}", [
        'content' => 'Updated question',
        'options' => [
            ['content' => 'Correct', 'is_correct' => true],
            ['content' => 'Incorrect', 'is_correct' => false],
        ],
    ])->assertOk()->assertJsonPath('content', 'Updated question')->assertJsonCount(2, 'options');

    $this->withToken($token)->deleteJson("/api/v1/admin/questions/{$question->id}")->assertNoContent();
    $this->withToken($token)->deleteJson("/api/v1/admin/lessons/{$lesson->id}")->assertNoContent();
    $this->withToken($token)->deleteJson("/api/v1/admin/courses/{$course->id}")->assertNoContent();
    $this->withToken($token)->deleteJson("/api/v1/admin/categories/{$category->id}")->assertNoContent();
}

public function test_student_is_forbidden_from_admin_course_detail(): void
{
    $student = User::factory()->create();
    $course = Course::factory()->create();
    $token = $student->createToken('test')->plainTextToken;

    $this->withToken($token)->getJson("/api/v1/admin/courses/{$course->id}")->assertForbidden();
}
```

Do not alter a controller in this task; the only approved backend production change is Task 1's admin resource and controller return type.

- [ ] **Step 4: Run the complete Laravel suite**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test
```

Expected: exit code 0 with no failed tests.

## Task 7: Whole-system verification and real browser flows

**Files:**
- No production file changes required.

**Interfaces:**
- Consumes: built frontend, migrated Laravel database, and the live local APIs.
- Produces: fresh evidence that the UI uses real backend data rather than frontend mocks.

- [ ] **Step 1: Run all frontend tests and build**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm run test
npm run build
```

- [ ] **Step 2: Prepare the local backend and start both applications**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan migrate:fresh --seed
php artisan serve
```

In a second PowerShell terminal:

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
$env:VITE_API_BASE_URL = 'http://localhost:8000/api/v1'
npm run dev -- --host 127.0.0.1
```

- [ ] **Step 3: Verify the real Student flow in a browser**

1. Register/login as a Student using the visible auth page.
2. Search/filter the catalog, open a published course, create an order, choose QR, and submit payment.
3. Confirm the course appears in My Courses with backend progress.
4. Open each lesson, mark it complete, verify the quiz unlocks only at 100%, submit answers, and download the issued PDF certificate.
5. Submit a review and refresh the course page to confirm it comes from the API.

- [ ] **Step 4: Verify the real Admin flow in a browser**

1. Login using a seeded Admin account.
2. Create and edit a category/course, add/reorder/edit/delete lessons, configure a quiz, then create/edit/delete questions.
3. Publish the course and confirm it appears in the public catalog without exposing correct answers.
4. Search/update a Student status and moderate a review.

- [ ] **Step 5: Record the evidence before making completion claims**

Record the exact pass counts from `npm run test`, `npm run build`, and `php artisan test`; check every acceptance criterion in the design specification against the running flows. If any browser action fails, add or correct a focused regression test before retrying.
