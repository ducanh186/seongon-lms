# Course Platform UI Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all requirements in `SPEC/course_platform_ui_feedback_ai_spec.md`, including the reproduced home API failure, persistent News management, role-correct navigation, student Cart/Notification controls, Admin table fixes, My Courses fixes, and a downloadable completed-course certificate demo.

**Architecture:** Keep Laravel as the authoritative API and React/MUI as the client. Add one persistent News domain to Laravel, one user-scoped `localStorage` Cart domain to React, and extend existing resources for Admin tables and certificate visibility. Reuse the current authentication, payment, enrollment, quiz, and PDF certificate flows.

**Tech Stack:** PHP 8.3, Laravel 13, Sanctum, Pest/PHPUnit, MySQL 8.4, React 18, TypeScript, React Router 7, MUI 7, Vitest 4, Testing Library, PowerShell 5.1+

## Global Constraints

- Implement every acceptance criterion in `SPEC/course_platform_ui_feedback_ai_spec.md`; do not silently skip requirements.
- Use `SPEC/seongon_learning_prototype_v3.html` as the primary visual/interaction reference.
- Align local FE requests with Laravel at `http://127.0.0.1:8000/api/v1`.
- Keep Admin and Student behavior separate.
- News content is plain text with line breaks; never render arbitrary stored HTML.
- Cart state is browser-local and scoped by authenticated user id.
- Notification is a student-only empty-state dropdown; do not add a notification backend.
- Preserve local data; never run `migrate:fresh`.
- Verify desktop behavior at 1280 px and 1440 px.
- Use Windows PowerShell commands; do not use Bash `&&` or `||`.
- Do not commit or push without explicit user instruction. Every task ends at a tested local checkpoint.

## File Map

### Backend additions

- `BE/database/migrations/2026_08_11_000001_create_news_posts_table.php`: News schema.
- `BE/app/Models/NewsPost.php`: publishable News model and scope.
- `BE/database/factories/NewsPostFactory.php`: test records.
- `BE/app/Http/Resources/NewsPostResource.php`: public/admin contract.
- `BE/app/Http/Controllers/Api/NewsController.php`: published list/detail.
- `BE/app/Http/Controllers/Api/Admin/NewsController.php`: Admin CRUD/publish/delete.
- `BE/tests/Feature/Api/NewsManagementTest.php`: News authorization, validation, visibility.
- `BE/database/seeders/CompletedCourseDemoSeeder.php`: idempotent completed enrollment and certificate.
- `BE/tests/Feature/CompletedCourseDemoSeederTest.php`: seed idempotency and PDF download.

### Backend modifications

- `BE/routes/api.php`: public/admin News routes.
- `BE/app/Http/Controllers/Api/Admin/UserController.php`: enrollment aggregate.
- `BE/app/Http/Resources/UserResource.php`: `enrollments_count`.
- `BE/app/Http/Controllers/Api/Admin/CourseController.php`: course table aggregates.
- `BE/app/Models/Course.php`: direct questions aggregate relationship.
- `BE/app/Http/Resources/CourseResource.php`: aggregate fields and certificate visibility.
- `BE/app/Http/Controllers/Api/Student/MyCourseController.php`: eager-load certificate.
- `BE/app/Http/Resources/EnrollmentResource.php`: certificate payload.
- `BE/database/seeders/DatabaseSeeder.php`: call completed-demo seeder.
- `BE/tests/Feature/Api/AdminManagementTest.php`: student/course list contracts.

### Frontend additions

- `FE/DEMO/src/app/cart/cartStorage.ts`: safe user-scoped storage adapter.
- `FE/DEMO/src/app/cart/CartContext.tsx`: cart operations and badge count.
- `FE/DEMO/src/app/cart/cartStorage.test.ts`: storage isolation/recovery tests.
- `FE/DEMO/src/app/pages/CartPage.tsx`: cart list and per-course checkout.
- `FE/DEMO/src/app/pages/CartPage.test.tsx`: cart behavior.
- `FE/DEMO/src/app/pages/NewsPage.tsx`: published News list.
- `FE/DEMO/src/app/pages/NewsDetailPage.tsx`: plain-text News detail.
- `FE/DEMO/src/app/pages/NewsPage.test.tsx`: public News states.
- `FE/DEMO/src/app/components/NotificationMenu.tsx`: student empty-state control.

### Frontend modifications

- `FE/DEMO/.env`: local API origin.
- `FE/DEMO/src/app/lib/api.ts`: News API methods.
- `FE/DEMO/src/app/lib/contracts.ts`: News, certificate, and aggregate types.
- `FE/DEMO/src/app/routes.tsx`: News and Cart routes.
- `FE/DEMO/src/app/App.tsx`: `CartProvider` placement.
- `FE/DEMO/src/app/components/GlobalHeader.tsx`: role-aware links/controls/menu.
- `FE/DEMO/src/app/components/Layout.test.tsx`: role regression tests.
- `FE/DEMO/src/app/components/AdminShell.tsx`: News section.
- `FE/DEMO/src/app/components/AdminDataTable.tsx`: stable desktop layout options.
- `FE/DEMO/src/app/pages/AdminPage.tsx`: student columns, course-first layout, News management.
- `FE/DEMO/src/app/pages/AdminPage.test.tsx`: Admin UI contracts.
- `FE/DEMO/src/app/pages/CoursePage.tsx`: add-to-cart action.
- `FE/DEMO/src/app/pages/CheckoutPage.tsx`: remove purchased cart item.
- `FE/DEMO/src/app/pages/MyCoursesPage.tsx`: stat/filter/CTA/certificate UI.
- `FE/DEMO/src/app/pages/MyCoursesPage.test.tsx`: My Courses regressions.
- `FE/DEMO/src/app/pages/Home.test.tsx`: successful public content regression.
- `FE/DEMO/src/app/lib/api.test.ts`: API origin regression.

---

### Task 1: Fix the Local API Origin and Lock the Home Regression

**Files:**
- Modify: `FE/DEMO/.env`
- Modify: `FE/DEMO/src/app/lib/api.test.ts`
- Verify: `FE/DEMO/src/app/pages/Home.test.tsx`

**Interfaces:**
- Consumes: `apiRequest<T>(path, options)` from `src/app/lib/api.ts`.
- Produces: all FE API calls target `http://127.0.0.1:8000/api/v1` in the checked local environment.

- [ ] **Step 1: Add a failing API-origin regression test**

Add a fetch assertion to `api.test.ts`:

```ts
it('uses the native Laravel API origin', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));

  await api.categories();

  expect(fetch).toHaveBeenCalledWith(
    'http://127.0.0.1:8000/api/v1/categories',
    expect.any(Object),
  );
});
```

- [ ] **Step 2: Run the focused test and verify the current port fails**

Run from `FE/DEMO`:

```powershell
npm test -- src/app/lib/api.test.ts
```

Expected: FAIL because the request URL contains `localhost:8001`.

- [ ] **Step 3: Align the frontend environment**

Set `FE/DEMO/.env` exactly to:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

- [ ] **Step 4: Run API and Home tests**

```powershell
npm test -- src/app/lib/api.test.ts src/app/pages/Home.test.tsx
```

Expected: both files PASS.

- [ ] **Step 5: Record a local checkpoint**

Confirm `git diff -- FE/DEMO/.env FE/DEMO/src/app/lib/api.test.ts` contains only the origin regression. Do not commit.

---

### Task 2: Add Persistent News Backend APIs

**Files:**
- Create: `BE/database/migrations/2026_08_11_000001_create_news_posts_table.php`
- Create: `BE/app/Models/NewsPost.php`
- Create: `BE/database/factories/NewsPostFactory.php`
- Create: `BE/app/Http/Resources/NewsPostResource.php`
- Create: `BE/app/Http/Controllers/Api/NewsController.php`
- Create: `BE/app/Http/Controllers/Api/Admin/NewsController.php`
- Create: `BE/tests/Feature/Api/NewsManagementTest.php`
- Modify: `BE/routes/api.php`

**Interfaces:**
- Produces: `GET /api/v1/news`, `GET /api/v1/news/{slug}`, and Admin CRUD at `/api/v1/admin/news`.
- Produces TypeScript-ready fields: `id`, `title`, `slug`, `category`, `excerpt`, `content`, `thumbnail`, `status`, `published_at`, `created_at`, `updated_at`.

- [ ] **Step 1: Write failing public visibility and Admin authorization tests**

Create `NewsManagementTest.php` with these core cases:

```php
public function test_public_news_only_lists_published_posts(): void
{
    NewsPost::factory()->count(2)->published()->create();
    NewsPost::factory()->draft()->create();

    $this->getJson('/api/v1/news')
        ->assertOk()
        ->assertJsonCount(2, 'data');
}

public function test_admin_can_create_update_publish_and_delete_news(): void
{
    $admin = User::factory()->admin()->create();
    $token = $admin->createToken('test')->plainTextToken;

    $created = $this->withToken($token)->postJson('/api/v1/admin/news', [
        'title' => 'SEO News',
        'category' => 'Tin tức marketing',
        'excerpt' => 'Bản tin SEO mới nhất.',
        'content' => "Dòng một.\nDòng hai.",
        'thumbnail' => null,
        'status' => 'draft',
    ])->assertCreated();

    $id = $created->json('data.id');
    $this->withToken($token)->putJson("/api/v1/admin/news/{$id}", [
        'title' => 'SEO News Updated',
        'category' => 'Tin tức marketing',
        'excerpt' => 'Nội dung đã cập nhật.',
        'content' => 'Plain text only.',
        'thumbnail' => null,
        'status' => 'published',
    ])->assertOk()->assertJsonPath('data.status', 'published');

    $this->withToken($token)->deleteJson("/api/v1/admin/news/{$id}")
        ->assertNoContent();
}
```

Also assert a Student receives `403`, public draft detail receives `404`, invalid status receives `422`, and a duplicate title receives a unique slug.

- [ ] **Step 2: Run the test to verify routes/classes are absent**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test tests/Feature/Api/NewsManagementTest.php
```

Expected: FAIL because `NewsPost` and routes do not exist.

- [ ] **Step 3: Implement schema, model, factory, and resource**

The migration `up()` creates:

```php
Schema::create('news_posts', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->string('slug')->unique();
    $table->string('category')->index();
    $table->text('excerpt');
    $table->longText('content');
    $table->string('thumbnail', 2048)->nullable();
    $table->enum('status', ['draft', 'published'])->default('draft')->index();
    $table->timestamp('published_at')->nullable()->index();
    $table->timestamps();
});
```

`NewsPost` defines `$fillable`, casts `published_at` to `datetime`, and exposes:

```php
public function scopePublished(Builder $query): Builder
{
    return $query->where('status', 'published')
        ->whereNotNull('published_at')
        ->where('published_at', '<=', now());
}
```

- [ ] **Step 4: Implement controllers and exact validation**

Use one `validatedData(Request $request)` method in the Admin controller:

```php
return $request->validate([
    'title' => ['required', 'string', 'max:255'],
    'category' => ['required', 'string', 'max:100'],
    'excerpt' => ['required', 'string', 'max:500'],
    'content' => ['required', 'string'],
    'thumbnail' => ['nullable', 'url', 'max:2048'],
    'status' => ['required', 'in:draft,published'],
]);
```

Generate unique slugs with the same loop style as Admin Course. Set `published_at` when status becomes `published`; clear it when status becomes `draft`.

- [ ] **Step 5: Register routes**

Add public routes beside categories/courses:

```php
Route::get('news', [NewsController::class, 'index']);
Route::get('news/{slug}', [NewsController::class, 'show']);
```

Add Admin resource routes inside the existing role middleware:

```php
Route::apiResource('news', AdminNewsController::class);
```

- [ ] **Step 6: Run focused backend tests**

```powershell
php artisan test tests/Feature/Api/NewsManagementTest.php tests/Feature/Api/AdminManagementTest.php
```

Expected: PASS.

- [ ] **Step 7: Record a local checkpoint**

Run `php artisan route:list --path=api/v1/news` and `php artisan route:list --path=api/v1/admin/news`. Do not commit.

---

### Task 3: Build Public News Pages

**Files:**
- Modify: `FE/DEMO/src/app/lib/contracts.ts`
- Modify: `FE/DEMO/src/app/lib/api.ts`
- Create: `FE/DEMO/src/app/pages/NewsPage.tsx`
- Create: `FE/DEMO/src/app/pages/NewsDetailPage.tsx`
- Create: `FE/DEMO/src/app/pages/NewsPage.test.tsx`
- Modify: `FE/DEMO/src/app/routes.tsx`

**Interfaces:**
- Consumes: backend `NewsPostResource`.
- Produces: `ApiNewsPost`, `api.news(filters)`, `api.newsPost(slug)`, `/news`, `/news/:slug`.

- [ ] **Step 1: Write failing public News page tests**

Test loading, published cards, category filtering, empty response, error retry, and detail rendering. The detail test must assert plain text is displayed and no HTML is interpreted:

```ts
expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
expect(document.querySelector('script')).toBeNull();
```

- [ ] **Step 2: Run the test and verify missing components fail**

```powershell
Set-Location D:\CODE\seongon-lms\FE\DEMO
npm test -- src/app/pages/NewsPage.test.tsx
```

Expected: FAIL because pages and methods do not exist.

- [ ] **Step 3: Add contract and API methods**

```ts
export interface ApiNewsPost {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  thumbnail: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
```

```ts
news: (filters: Record<string, string | number | undefined> = {}) =>
  apiRequest<Paginated<ApiNewsPost>>(`/news${queryString(filters)}`),
newsPost: (slug: string) => apiRequest<{ data: ApiNewsPost }>(`/news/${slug}`),
```

- [ ] **Step 4: Implement list and detail pages with existing async states**

Use `PageSkeleton`, `RequestError`, `EmptyState`, `SectionHeading`, MUI `Card`, and `Typography`. Render content with:

```tsx
<Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
  {post.content}
</Typography>
```

Do not use `dangerouslySetInnerHTML`.

- [ ] **Step 5: Register routes**

```tsx
{ path: 'news', Component: NewsPage },
{ path: 'news/:slug', Component: NewsDetailPage },
```

- [ ] **Step 6: Run focused tests and build**

```powershell
npm test -- src/app/pages/NewsPage.test.tsx src/app/lib/api.test.ts
npm run build
```

Expected: PASS and Vite build exits `0`.

- [ ] **Step 7: Record a local checkpoint**

Confirm only public News files and contracts changed in this task. Do not commit.

---

### Task 4: Add Admin News Management

**Files:**
- Modify: `FE/DEMO/src/app/components/AdminShell.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.test.tsx`
- Modify: `FE/DEMO/src/app/lib/api.ts`

**Interfaces:**
- Consumes: `ApiNewsPost` and Admin News endpoints.
- Produces: Admin section key `'news'`, search/status filtering, create/edit/publish/delete controls.

- [ ] **Step 1: Add failing Admin News tests**

Assert `Quản lý tin tức` exists, draft/published rows render, saving sends plain text fields, and delete uses the existing confirmation dialog. Assert a Student cannot render Admin routes through existing `RequireAuth` coverage.

- [ ] **Step 2: Run the focused test**

```powershell
npm test -- src/app/pages/AdminPage.test.tsx
```

Expected: FAIL because the News section is absent.

- [ ] **Step 3: Add Admin API methods**

```ts
adminNews: (token: string, filters = {}) =>
  apiRequest<Paginated<ApiNewsPost>>(`/admin/news${queryString(filters)}`, { token }),
saveNews: (token: string, body: Record<string, unknown>, id?: number) =>
  apiRequest<{ data: ApiNewsPost }>(id ? `/admin/news/${id}` : '/admin/news', {
    method: id ? 'PUT' : 'POST', token, body,
  }),
deleteNews: (token: string, id: number) =>
  apiRequest<void>(`/admin/news/${id}`, { method: 'DELETE', token }),
```

- [ ] **Step 4: Add the Admin section and focused editor**

Extend `AdminSection` with `'news'`. Add fields for title, category, excerpt, content, thumbnail URL, and status. Keep the list primary and reveal the editor only for create/edit, matching the course-management priority decision.

- [ ] **Step 5: Run Admin tests**

```powershell
npm test -- src/app/pages/AdminPage.test.tsx src/app/components/Layout.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Record a local checkpoint**

Confirm Admin News writes only through the real API and contains no mock array. Do not commit.

---

### Task 5: Make the Header Strictly Role-Aware

**Files:**
- Create: `FE/DEMO/src/app/components/NotificationMenu.tsx`
- Modify: `FE/DEMO/src/app/components/GlobalHeader.tsx`
- Modify: `FE/DEMO/src/app/components/Layout.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` user role and Cart count from Task 6 when available.
- Produces: guest/student/admin navigation rules and student notification empty state.

- [ ] **Step 1: Rewrite the role tests before implementation**

Add assertions:

```ts
expect(screen.getByRole('link', { name: 'Tin tức' })).toBeInTheDocument();
expect(screen.queryByRole('link', { name: 'Khóa học của tôi' })).not.toBeInTheDocument();
```

For Admin menu, assert `Khóa học của tôi`, notification, and cart are absent. For Student, open the avatar menu and assert `Hồ sơ` and `Khóa học của tôi` exist while `Quản trị` is absent. Click notification and assert `Bạn chưa có thông báo mới.`.

- [ ] **Step 2: Run Layout tests and verify role leaks fail**

```powershell
npm test -- src/app/components/Layout.test.tsx
```

Expected: FAIL because Admin currently sees My Courses and Student has a standalone My Courses link.

- [ ] **Step 3: Implement one role-derived navigation source**

Use these exact link rules:

```ts
const publicLinks = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Khóa học', to: '/courses' },
  { label: 'Tin tức', to: '/news' },
];
const links = user?.role === 'admin'
  ? [...publicLinks, { label: 'Quản trị', to: '/admin' }]
  : publicLinks;
```

Render `NotificationMenu` only when `user?.role === 'student'`. In the avatar menu, render My Courses only for Students and Admin only for Admins. Apply identical rules to mobile navigation.

- [ ] **Step 4: Run Layout tests**

```powershell
npm test -- src/app/components/Layout.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Record a local checkpoint**

Search `GlobalHeader.tsx` for every `my-courses` occurrence and confirm each is Student-gated. Do not commit.

---

### Task 6: Add the User-Scoped Cart and Existing Checkout Integration

**Files:**
- Create: `FE/DEMO/src/app/cart/cartStorage.ts`
- Create: `FE/DEMO/src/app/cart/CartContext.tsx`
- Create: `FE/DEMO/src/app/cart/cartStorage.test.ts`
- Create: `FE/DEMO/src/app/pages/CartPage.tsx`
- Create: `FE/DEMO/src/app/pages/CartPage.test.tsx`
- Modify: `FE/DEMO/src/app/App.tsx`
- Modify: `FE/DEMO/src/app/routes.tsx`
- Modify: `FE/DEMO/src/app/components/GlobalHeader.tsx`
- Modify: `FE/DEMO/src/app/pages/CoursePage.tsx`
- Modify: `FE/DEMO/src/app/pages/CheckoutPage.tsx`

**Interfaces:**
- Produces: `CartItem`, `readCart(userId)`, `writeCart(userId, items)`, `useCart()` with `items`, `add`, `remove`, `count`, `contains`.

- [ ] **Step 1: Write storage tests**

Use the exact key format `seongon-cart:user:<id>`. Test two users do not share items, duplicate course ids are collapsed, and malformed JSON returns `[]` and removes the corrupt key.

```ts
export type CartItem = {
  courseId: number;
  slug: string;
  title: string;
  price: string;
  thumbnail: string | null;
};
```

- [ ] **Step 2: Run storage tests and verify missing module fails**

```powershell
npm test -- src/app/cart/cartStorage.test.ts
```

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement safe storage and Cart context**

`readCart` catches JSON/type failures and returns `[]`. `writeCart` de-duplicates by `courseId`. `CartProvider` derives the current storage key from `user?.id`; Admin/guest state remains empty.

- [ ] **Step 4: Write Cart page and checkout-removal tests**

Assert the page shows item count/total, removes an item, routes `Thanh toán` to `/checkout/:slug`, and successful checkout calls `remove(course.id)` before navigating to `/my-courses`.

- [ ] **Step 5: Implement Cart page and route**

Add protected route:

```tsx
{ path: 'cart', Component: CartPage },
```

Render a Student-only header icon with `aria-label="Giỏ hàng"` and MUI `Badge`. Add `Thêm vào giỏ hàng` on `CoursePage`; keep direct checkout available.

- [ ] **Step 6: Integrate successful payment removal**

In `CheckoutPage.pay()`:

```ts
await api.payOrder(token, order.id, method);
remove(course.id);
navigate('/my-courses', { state: { notice: 'Thanh toán thành công. Bạn đã có thể bắt đầu học.' } });
```

- [ ] **Step 7: Run Cart, checkout, header, and build checks**

```powershell
npm test -- src/app/cart/cartStorage.test.ts src/app/pages/CartPage.test.tsx src/app/pages/CheckoutPage.test.tsx src/app/components/Layout.test.tsx
npm run build
```

Expected: PASS and build exits `0`.

- [ ] **Step 8: Record a local checkpoint**

Confirm no cart table, backend cart endpoint, or multi-course payment logic was added. Do not commit.

---

### Task 7: Expand Admin Student Information

**Files:**
- Modify: `BE/app/Http/Controllers/Api/Admin/UserController.php`
- Modify: `BE/app/Http/Resources/UserResource.php`
- Modify: `BE/tests/Feature/Api/AdminManagementTest.php`
- Modify: `FE/DEMO/src/app/lib/contracts.ts`
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.test.tsx`

**Interfaces:**
- Produces: optional `ApiUser.enrollments_count: number` on Admin list responses.

- [ ] **Step 1: Add failing backend aggregate test**

Create a Student with two enrollments and assert:

```php
$this->withToken($token)->getJson('/api/v1/admin/users')
    ->assertOk()
    ->assertJsonPath('data.0.enrollments_count', 2);
```

- [ ] **Step 2: Run backend test and verify the field is absent**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test tests/Feature/Api/AdminManagementTest.php
```

Expected: FAIL on `enrollments_count`.

- [ ] **Step 3: Add one aggregate query and conditional resource field**

Use:

```php
$query = User::where('role', 'student')->withCount('enrollments');
```

Expose:

```php
'enrollments_count' => $this->whenCounted('enrollments'),
```

- [ ] **Step 4: Add failing frontend column test**

Assert headers are `Học viên`, `Email`, `SĐT`, `Khóa đã đăng ký`, `Ngày tạo`, `Trạng thái`, `Thao tác`, and the row renders the count/date without removing lock/unlock.

- [ ] **Step 5: Implement prototype-aligned Student columns**

Extend `ApiUser` and use the existing `AdminDataTable` with seven aligned column definitions. Format dates with `toLocaleDateString('vi-VN')` and use `—` for a missing phone.

- [ ] **Step 6: Run backend/frontend tests**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test tests/Feature/Api/AdminManagementTest.php
Set-Location D:\CODE\seongon-lms\FE\DEMO
npm test -- src/app/pages/AdminPage.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Record a local checkpoint**

Confirm the Admin query uses `withCount` and no per-row enrollment request exists. Do not commit.

---

### Task 8: Rebuild Course Management Around the List

**Files:**
- Modify: `BE/app/Http/Controllers/Api/Admin/CourseController.php`
- Modify: `BE/app/Models/Course.php`
- Modify: `BE/app/Http/Resources/CourseResource.php`
- Modify: `BE/tests/Feature/Api/AdminManagementTest.php`
- Modify: `FE/DEMO/src/app/components/AdminDataTable.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.test.tsx`

**Interfaces:**
- Produces: `lessons_count`, `questions_count`, `enrollments_count` on Admin course rows.
- Produces: a list-first course screen with one shared column definition for headers and rows.

- [ ] **Step 1: Add failing backend course aggregate test**

Create a course with lessons, quiz questions, and enrollments. Assert Admin list returns all three counts.

```php
->assertJsonPath('data.0.lessons_count', 2)
->assertJsonPath('data.0.questions_count', 3)
->assertJsonPath('data.0.enrollments_count', 4);
```

- [ ] **Step 2: Add failing frontend structural tests**

Assert all prototype columns appear, `Tạo khóa học mới` reveals the form, the form is initially absent, and each data row has the same number of cells as the header.

- [ ] **Step 3: Run focused tests and record failures**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test tests/Feature/Api/AdminManagementTest.php
Set-Location D:\CODE\seongon-lms\FE\DEMO
npm test -- src/app/pages/AdminPage.test.tsx
```

Expected: FAIL on missing question count and list-first form behavior.

- [ ] **Step 4: Add backend aggregates**

Add a direct aggregate relationship to `Course`:

```php
public function questions(): HasManyThrough
{
    return $this->hasManyThrough(
        Question::class,
        Quiz::class,
        'course_id',
        'quiz_id',
    );
}
```

Import `HasManyThrough` and use the relationship in the list query:

```php
$query = Course::with('category')
    ->withCount(['lessons', 'questions', 'enrollments']);
```

- [ ] **Step 5: Implement list-first UI and table layout**

Keep search, status, and `Áp dụng` in the first toolbar. Move create/edit into a conditional Card opened by `Tạo khóa học mới` or `Sửa`. Use columns: course, category, level, price, lessons, questions, enrollments, status, actions.

Add optional table props:

```ts
minWidth?: number;
stickyFirstColumn?: boolean;
```

Use `minWidth={1120}` only for the course table. Keep header/body generated from `columns.map` and give Actions the same right alignment in both paths.

- [ ] **Step 6: Run tests and build**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test tests/Feature/Api/AdminManagementTest.php
Set-Location D:\CODE\seongon-lms\FE\DEMO
npm test -- src/app/pages/AdminPage.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 7: Inspect at desktop widths**

At 1280 px and 1440 px, confirm header/body alignment, Actions alignment, visible first/last columns, and intentional container overflow. Record screenshots outside the repository.

- [ ] **Step 8: Record a local checkpoint**

Confirm create/edit/content/publish/delete actions remain reachable. Do not commit.

---

### Task 9: Correct My Courses Summary, Filters, CTA, and Certificate Action

**Files:**
- Modify: `BE/app/Http/Controllers/Api/Student/MyCourseController.php`
- Modify: `BE/app/Http/Resources/EnrollmentResource.php`
- Modify: `FE/DEMO/src/app/lib/contracts.ts`
- Modify: `FE/DEMO/src/app/pages/MyCoursesPage.tsx`
- Modify: `FE/DEMO/src/app/pages/MyCoursesPage.test.tsx`

**Interfaces:**
- Produces: optional `ApiEnrollment.certificate: ApiCertificate | null`.
- Produces: default filter `all`, label-before-number summary, and completed-course PDF action.

- [ ] **Step 1: Add failing backend certificate payload test**

Create one enrollment with a certificate and assert `/api/v1/my/courses` returns `data.0.certificate.certificate_code`.

- [ ] **Step 2: Add failing frontend hierarchy tests**

Assert toolbar buttons occur in DOM order `Tất cả`, `Đang học`, `Đã hoàn thành`; `Tất cả` is pressed by default; within each statistic cell the label precedes the number; `Khám phá thêm` uses a contained button; and completed certificate data renders `Tải chứng chỉ`.

- [ ] **Step 3: Run focused tests**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test tests/Feature/Api/StudentLearningFlowTest.php
Set-Location D:\CODE\seongon-lms\FE\DEMO
npm test -- src/app/pages/MyCoursesPage.test.tsx
```

Expected: FAIL on ordering/default/certificate payload.

- [ ] **Step 4: Eager-load and expose certificates**

Use `->with(['course.category', 'certificate'])` and resource output:

```php
'certificate' => new CertificateResource($this->whenLoaded('certificate')),
```

- [ ] **Step 5: Implement the summary/filter/CTA design**

Set:

```ts
const filters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang học' },
  { value: 'completed', label: 'Đã hoàn thành' },
];
const [filter, setFilter] = useState<EnrollmentFilter>('all');
```

Render label before value inside a vertical Stack. Put the whole summary in one white, bordered, rounded Card with no sticky background bleed. Change CTA to `variant="contained"`. For a completed enrollment with a certificate, download through `api.downloadCertificate(token, courseId)`.

- [ ] **Step 6: Run tests and build**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test tests/Feature/Api/StudentLearningFlowTest.php
Set-Location D:\CODE\seongon-lms\FE\DEMO
npm test -- src/app/pages/MyCoursesPage.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 7: Inspect section boundaries**

At 1280 px and 1440 px, verify the white summary boundary, padding, margins, radius, and no overlap with the filter/content sections.

- [ ] **Step 8: Record a local checkpoint**

Confirm filtering semantics remain percent-based and expired-course protections remain intact. Do not commit.

---

### Task 10: Seed an Idempotent Completed Demo Course and Certificate

**Files:**
- Create: `BE/database/seeders/CompletedCourseDemoSeeder.php`
- Create: `BE/tests/Feature/CompletedCourseDemoSeederTest.php`
- Modify: `BE/database/seeders/DatabaseSeeder.php`

**Interfaces:**
- Consumes: `student@seongon.vn`, existing catalog relationships, `CertificateService`.
- Produces: one active 100% enrollment with a passing attempt and downloadable certificate.

- [ ] **Step 1: Write the failing idempotency test**

Seed the base user/course/lessons/quiz, run the seeder twice, and assert exactly one enrollment, one progress row per lesson, one passing attempt, and one certificate. Authenticate the demo Student and assert certificate download returns PDF headers.

```php
$this->seed(CompletedCourseDemoSeeder::class);
$this->seed(CompletedCourseDemoSeeder::class);
$this->assertDatabaseCount('certificates', 1);
```

- [ ] **Step 2: Run the focused test**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test tests/Feature/CompletedCourseDemoSeederTest.php
```

Expected: FAIL because the seeder is absent.

- [ ] **Step 3: Implement additive idempotent seeding**

Use `firstOrCreate`/`updateOrCreate` for the demo course dependencies, enrollment, progress, attempt, answers, and certificate. Never truncate tables. Use the existing demo user password `password` from `UserFactory`.

The seeded course title is `Completed Demo Course`; it is published, has at least two lessons, one quiz, one question with one correct and one incorrect option, all lesson progress complete, a score of `100`, and an issued certificate from `CertificateService`.

- [ ] **Step 4: Register the additive seeder**

Call it after `GeneratedDemoCatalogSeeder` in `DatabaseSeeder` so required users/catalog data exist.

- [ ] **Step 5: Run the test twice and verify PDF**

```powershell
php artisan test tests/Feature/CompletedCourseDemoSeederTest.php
php artisan test tests/Feature/CompletedCourseDemoSeederTest.php
```

Expected: PASS both times.

- [ ] **Step 6: Apply non-destructively to local DB**

```powershell
php artisan migrate --force
php artisan db:seed --class=CompletedCourseDemoSeeder --force
```

Expected: migrations succeed without dropping tables; seeder reports no duplicate-key failure.

- [ ] **Step 7: Re-dump proof counts**

Use an Artisan command/tinker query that prints only: demo email, course title, progress percent, attempt score, and certificate code. Do not print password hashes or tokens.

- [ ] **Step 8: Record a local checkpoint**

Confirm no existing course/enrollment was removed. Do not commit.

---

### Task 11: Full Regression and Live Browser Verification

**Files:**
- Modify only if a failing check identifies a root cause in an already scoped file.
- Evidence screenshots/logs: store outside `D:\CODE\seongon-lms`.

**Interfaces:**
- Consumes every prior task.
- Produces evidence for all 15 product acceptance criteria and the reproduced home failure.

- [ ] **Step 1: Run all backend tests**

```powershell
Set-Location D:\CODE\seongon-lms\BE
php artisan test
```

Expected: exit `0`.

- [ ] **Step 2: Run all frontend tests and production build**

```powershell
Set-Location D:\CODE\seongon-lms\FE\DEMO
npm test
npm run build
```

Expected: both exit `0`.

- [ ] **Step 3: Start the native stack**

```powershell
Set-Location D:\CODE\seongon-lms\Infra
.\start-local-web-windows.ps1
```

Expected:

```text
Backend ready: http://127.0.0.1:8000
Frontend ready: http://localhost:5173
```

- [ ] **Step 4: Verify live API boundaries**

Request `/up`, `/api/v1/categories`, `/api/v1/courses?sort=popular`, and `/api/v1/news`. Expected: HTTP `200` and JSON for API endpoints.

- [ ] **Step 5: Verify the exact home-page regression**

Open `http://localhost:5173`. Expected: category cards and popular course cards render; text `Không thể tải nội dung trang chủ.` is absent; retry banner is absent.

- [ ] **Step 6: Verify role behavior**

Guest: Tin tức visible. Student: Notification, Cart, avatar Profile/My Courses; no standalone My Courses nav. Admin: Quản trị; no My Courses, Notification, or Cart.

- [ ] **Step 7: Verify News end-to-end**

As Admin, create a draft, publish it, edit it, and confirm it appears on `/news`; hide/delete it and confirm it leaves the public list.

- [ ] **Step 8: Verify Cart and checkout**

As Student, add two courses, verify badge `2`, checkout one, verify it is removed and the other remains, and confirm the enrollment appears in My Courses.

- [ ] **Step 9: Verify Admin Student and Course tables**

At 1280 px and 1440 px, verify every required column, equal header/body cell count, aligned Actions, stable horizontal behavior, Student enrollment counts, and retained search/Apply behavior.

- [ ] **Step 10: Verify My Courses and certificate demo**

Login as `student@seongon.vn` with the existing demo password `password`. Confirm labels appear above values, filters are `Tất cả -> Đang học -> Đã hoàn thành`, the completed demo course appears, and certificate download produces a non-empty PDF.

- [ ] **Step 11: Audit all spec checkboxes**

Walk the 15 acceptance criteria in `SPEC/course_platform_ui_feedback_ai_spec.md` one by one and attach a test name, live URL, or screenshot to each. Any criterion without evidence remains incomplete.

- [ ] **Step 12: Final local checkpoint**

Run `git status --short`, list only files changed for this scope, call out pre-existing unrelated files, and do not stage/commit/push.
