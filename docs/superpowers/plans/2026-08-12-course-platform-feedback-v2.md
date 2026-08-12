# Course Platform Feedback v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Laravel-backed SEONGON Learning product into prototype-led desktop alignment and satisfy every requirement from `FB-01` through `FB-45` with automated and browser evidence.

**Architecture:** Keep Laravel as the source of truth and the React application as the rendering/interaction layer. Split new desktop shell, Mega Menu, generated-content sections, and Admin Dashboard into focused components; extend API responses only where real aggregate data is missing. Every task follows RED → GREEN → review and leaves a separately testable deliverable.

**Tech Stack:** Laravel/PHP, MySQL, React 18, TypeScript, React Router, MUI, Vitest/Testing Library, Vite, `imagegen`, browser-use.

## Global Constraints

- Latest explicit user direction overrides all other sources; then follow prototype logic, `feedback_cleaned.md`, and current code in that order.
- Support desktop viewports from exactly `1280px`; show the approved unsupported-screen notice below `1280px`.
- Remove mobile navigation, hamburger controls, and app-level responsive layouts; do not render a compressed desktop app below the width gate.
- Acceptance viewports are exactly `1280×800` and `1440×900` at browser zoom `100%`.
- The Courses Mega Menu opens on `mouseenter` or keyboard focus, never by click; animation and close delay are each `200ms`.
- Clicking `Khóa học` navigates to `/courses`; category links navigate to `/courses?category=<slug>`.
- Use real Laravel API data for roles, categories, courses, news, carts, learning, certificates, tables, and Admin metrics.
- Generate new visual assets with `imagegen`, store them locally, and never hotlink/copy third-party images.
- Every fictional testimonial visibly displays `Nội dung minh họa`; names and quotes render as HTML.
- Preserve the Guest/Student/Admin control matrix in the approved SPEC.
- Keep user-facing copy Vietnamese and keep source identifiers, code comments, commits, and filenames English.
- Do not use `migrate:fresh`; migrations and seeders must be additive and idempotent.
- Do not commit or push during execution unless the user explicitly authorizes it.

---

## File Responsibility Map

| File/unit | Responsibility |
|---|---|
| `components/DesktopOnlyGate.tsx` | Own the `1280px` support boundary and unsupported-screen notice |
| `components/CourseMegaMenu.tsx` | Own hover/focus timing, category loading, routing, and accessibility |
| `components/PublicFooter.tsx` | Own the prototype-style four-column public footer |
| `components/HomeHero.tsx` | Own home value proposition and generated hero art |
| `components/IllustrativeTestimonials.tsx` | Own labelled fictional testimonial cards |
| `pages/AdminOverview.tsx` | Own real Admin aggregate dashboard visualizations |
| `lib/contracts.ts` | Define exact Laravel response types shared by pages/components |
| `lib/api.ts` | Expose typed API calls; no presentation logic |
| `public/generated-images/manifest.json` | Record prompt, output, dimensions, and target usage for generated assets |
| Laravel controllers/resources | Produce authoritative filters, counts, summaries, and aggregate series |
| Feature/component tests | Prove behavior and contracts before production changes |
| Manual checklist | Record browser comparison evidence after all automated checks pass |

---

### Task 1: Desktop-only application shell and public footer

**Files:**
- Create: `FE/DEMO/src/app/components/DesktopOnlyGate.tsx`
- Create: `FE/DEMO/src/app/components/DesktopOnlyGate.test.tsx`
- Create: `FE/DEMO/src/app/components/PublicFooter.tsx`
- Modify: `FE/DEMO/src/app/App.tsx`
- Modify: `FE/DEMO/src/app/components/Layout.tsx`
- Modify: `FE/DEMO/src/app/components/Layout.test.tsx`
- Modify: `FE/DEMO/src/app/theme.ts`

**Interfaces:**
- Produces: `DesktopOnlyGate({ children }: PropsWithChildren): JSX.Element`
- Produces: `PublicFooter(): JSX.Element`
- Consumes: MUI `useMediaQuery('(min-width:1280px)')` and existing `layoutTokens.contentMaxWidth`

- [ ] **Step 1: Write the failing width-gate tests**

Add tests that mock `window.matchMedia` at `1440px` and `1279px`:

```tsx
it('renders the application at 1280px and above', () => {
  setViewportMatch(true);
  render(<DesktopOnlyGate><div>Desktop app</div></DesktopOnlyGate>);
  expect(screen.getByText('Desktop app')).toBeVisible();
  expect(screen.queryByText(/Vui lòng sử dụng màn hình máy tính/)).not.toBeInTheDocument();
});

it('replaces the application below 1280px', () => {
  setViewportMatch(false);
  render(<DesktopOnlyGate><div>Desktop app</div></DesktopOnlyGate>);
  expect(screen.queryByText('Desktop app')).not.toBeInTheDocument();
  expect(screen.getByText('Vui lòng sử dụng màn hình máy tính để có trải nghiệm đầy đủ.')).toBeVisible();
});
```

- [ ] **Step 2: Run the focused tests and capture RED**

Run:

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/components/DesktopOnlyGate.test.tsx --maxWorkers=1
```

Expected: FAIL because `DesktopOnlyGate.tsx` does not exist.

- [ ] **Step 3: Implement the gate and wrap all providers/routes**

Implement a full-viewport notice with `role="status"`, center alignment, and no child rendering below the breakpoint. Wrap `AuthProvider`, `CartProvider`, and `RouterProvider` inside the gate so unsupported widths do not start application requests.

```tsx
export function DesktopOnlyGate({ children }: PropsWithChildren) {
  const supported = useMediaQuery('(min-width:1280px)', { noSsr: true });
  if (!supported) {
    return <Box role="status" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 4 }}>
      <Typography variant="h5" textAlign="center">Vui lòng sử dụng màn hình máy tính để có trải nghiệm đầy đủ.</Typography>
    </Box>;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Replace the short footer with `PublicFooter`**

Render four desktop columns: brand summary, course discovery, account/support, and contact/policy. Use real routes and avoid links that bypass role guards.

- [ ] **Step 5: Remove responsive shell tokens from touched files**

Replace `xs/sm/md` layout branches in `Layout.tsx` and `PublicFooter.tsx` with fixed desktop layouts; keep `maxWidth: layoutTokens.contentMaxWidth` and at least `24px` side padding.

- [ ] **Step 6: Run GREEN and regression tests**

```powershell
npm test -- src/app/components/DesktopOnlyGate.test.tsx src/app/components/Layout.test.tsx --maxWorkers=1
npm run build
```

Expected: all focused tests pass; Vite build exits `0`.

- [ ] **Step 7: Review gate**

Confirm sub-`1280px` rendering contains no header, footer, route content, or horizontal overflow. Record task evidence; do not commit without user authorization.

---

### Task 2: Desktop header, hover Mega Menu, and role matrix

**Files:**
- Create: `FE/DEMO/src/app/components/CourseMegaMenu.tsx`
- Create: `FE/DEMO/src/app/components/CourseMegaMenu.test.tsx`
- Modify: `FE/DEMO/src/app/components/GlobalHeader.tsx`
- Modify: `FE/DEMO/src/app/components/Layout.test.tsx`
- Modify: `FE/DEMO/src/app/components/RequireAuth.tsx`
- Modify: `FE/DEMO/src/app/components/RequireAuth.test.tsx`
- Modify: `FE/DEMO/src/app/pages/AuthPage.test.tsx`

**Interfaces:**
- Consumes: `api.categories(): Promise<{ data: ApiCategory[] }>`
- Produces: `CourseMegaMenu({ active }: { active: boolean }): JSX.Element`
- Produces: route state `{ from: string }` when Guest opens `/cart`
- Timing constants: `OPEN_MS = 200`, `CLOSE_DELAY_MS = 200`

- [ ] **Step 1: Write failing Mega Menu behavior tests**

Use fake timers and mock `api.categories`:

```tsx
it('opens on mouseenter, remains open over the panel, and closes after 200ms', async () => {
  vi.useFakeTimers();
  vi.mocked(api.categories).mockResolvedValue({ data: categories });
  renderHeaderAsGuest();
  fireEvent.mouseEnter(screen.getByRole('link', { name: 'Khóa học' }));
  expect(await screen.findByRole('navigation', { name: 'Danh mục khóa học' })).toBeVisible();
  fireEvent.mouseLeave(screen.getByRole('link', { name: 'Khóa học' }));
  fireEvent.mouseEnter(screen.getByRole('navigation', { name: 'Danh mục khóa học' }));
  vi.advanceTimersByTime(250);
  expect(screen.getByRole('navigation', { name: 'Danh mục khóa học' })).toBeVisible();
  fireEvent.mouseLeave(screen.getByRole('navigation', { name: 'Danh mục khóa học' }));
  vi.advanceTimersByTime(199);
  expect(screen.getByRole('navigation', { name: 'Danh mục khóa học' })).toBeVisible();
  vi.advanceTimersByTime(1);
  expect(screen.queryByRole('navigation', { name: 'Danh mục khóa học' })).not.toBeInTheDocument();
});
```

Add tests for focus open, `Escape`, re-entry cancellation, click navigation, category query routing, loading, error, empty, and reduced-motion behavior.

- [ ] **Step 2: Add failing role-matrix tests**

Assert:

- Guest: Home/Courses/News/Search/Cart/Login/Register; no Notification/avatar.
- Student: Home/Courses/News/Search/Notification/Cart badge/avatar; My Courses only in avatar.
- Admin on Public Site: Home/Courses/News/Search/avatar/Admin Portal menu; no Notification/Cart/My Courses/standalone Admin nav.
- No hamburger or mobile drawer button for any role.

- [ ] **Step 3: Run tests and capture RED**

```powershell
npm test -- src/app/components/CourseMegaMenu.test.tsx src/app/components/Layout.test.tsx src/app/components/RequireAuth.test.tsx --maxWorkers=1
```

Expected: failures for missing Mega Menu, Guest Cart, Register placement, active underline, and remaining mobile navigation.

- [ ] **Step 4: Implement `CourseMegaMenu`**

Use a trigger wrapper that owns pointer/focus boundaries. Fetch categories once on first open and retain the resolved list for the header lifetime. The trigger is a React Router `Link` to `/courses`; do not attach an open toggle to `onClick`.

Required trigger attributes:

```tsx
aria-haspopup="menu"
aria-expanded={open}
aria-controls="course-mega-menu"
```

The panel uses `id="course-mega-menu"`, a stable width, `opacity/translateY` transition `200ms`, and an `Escape` listener that restores trigger focus.

- [ ] **Step 5: Rebuild `GlobalHeader` as fixed desktop navigation**

- Render real logo image at `44–48px` height.
- Remove all breakpoint/mobile drawer code.
- Replace filled active state with brand text and `borderBottom: '2px solid'`.
- Integrate role matrix exactly.
- Guest Cart links to `/cart`; `RequireAuth` redirects to `/login` with `{ state: { from: '/cart' } }`.
- Preserve Student cart badge and notification behavior.

- [ ] **Step 6: Run GREEN and regression tests**

```powershell
npm test -- src/app/components/CourseMegaMenu.test.tsx src/app/components/Layout.test.tsx src/app/components/RequireAuth.test.tsx src/app/pages/AuthPage.test.tsx --maxWorkers=1
npm run build
```

- [ ] **Step 7: Reviewer gate**

Inspect source for any click-to-open path, orphaned timer, repeated API request on each hover, or mobile navigation. Record findings and complete a bounded fix loop before moving on.

---

### Task 3: Generate approved visuals and rebuild Home

**Files:**
- Create: `FE/DEMO/public/generated-images/home-hero.webp`
- Create: `FE/DEMO/public/generated-images/catalog-hero.webp`
- Create: `FE/DEMO/public/generated-images/course-seo.webp`
- Create: `FE/DEMO/public/generated-images/course-ads.webp`
- Create: `FE/DEMO/public/generated-images/course-content.webp`
- Create: `FE/DEMO/public/generated-images/course-ai-search.webp`
- Create: `FE/DEMO/public/generated-images/course-analytics.webp`
- Create: `FE/DEMO/public/generated-images/testimonial-01.webp`
- Create: `FE/DEMO/public/generated-images/testimonial-02.webp`
- Create: `FE/DEMO/public/generated-images/testimonial-03.webp`
- Create: `FE/DEMO/public/generated-images/manifest.json`
- Create: `FE/DEMO/src/app/components/HomeHero.tsx`
- Create: `FE/DEMO/src/app/components/IllustrativeTestimonials.tsx`
- Modify: `FE/DEMO/src/app/pages/Home.tsx`
- Modify: `FE/DEMO/src/app/pages/Home.test.tsx`
- Modify: `FE/DEMO/src/app/components/MetricsStrip.tsx`
- Modify: `FE/DEMO/src/app/components/CourseCard.tsx`
- Modify: `BE/app/Support/DemoCourseThumbnail.php`
- Modify: `BE/database/factories/CourseFactory.php`
- Modify: `BE/database/seeders/GeneratedDemoCatalogSeeder.php`
- Modify: `BE/database/seeders/CompletedCourseDemoSeeder.php`
- Create: `BE/database/migrations/2026_08_12_000002_use_generated_course_images.php`
- Modify: `BE/tests/Feature/GeneratedDemoCatalogSeederTest.php`
- Modify: `BE/tests/Feature/CompletedCourseDemoSeederTest.php`

**Interfaces:**
- `HomeHero(): JSX.Element` uses `/generated-images/home-hero.webp`
- `IllustrativeTestimonials(): JSX.Element` renders exactly three labelled demo items
- `DemoCourseThumbnail::forTrack(string $track, int $index): string` returns local generated-image URLs
- `manifest.json` entries: `{ file, prompt, width, height, target, generated_at }`

- [ ] **Step 1: Write failing Home and backend asset tests**

Frontend assertions:

```tsx
expect(screen.getByRole('heading', { name: /Nền tảng học tập Marketing thực chiến/i })).toBeVisible();
expect(screen.queryByText('Lộ trình bài học')).not.toBeInTheDocument();
expect(screen.getAllByText('Nội dung minh họa')).toHaveLength(3);
expect(screen.getAllByRole('article', { name: /Khóa học/ })).toHaveLength(8);
```

Backend assertions:

```php
$this->assertDatabaseMissing('courses', ['thumbnail' => '/course-images/course-thumb-1.svg']);
$this->assertStringStartsWith('/generated-images/', Course::firstOrFail()->thumbnail);
$this->assertStringStartsWith('/generated-images/', Course::factory()->create()->thumbnail);
```

- [ ] **Step 2: Run tests and capture RED**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/Home.test.tsx --maxWorkers=1
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/GeneratedDemoCatalogSeederTest.php
```

- [ ] **Step 3: Generate and inspect assets with `imagegen`**

Use the image generation tool once per coherent asset family. Base prompt:

```text
Premium Vietnamese Marketing academy illustration, SEONGON-inspired navy teal and magenta palette, clean editorial lighting, sophisticated abstract search analytics interfaces, spacious 16:9 composition, no readable text, no logos, no certificates, no watermarks, no real-person likeness.
```

Append subject-specific direction for SEO network, paid-ad funnel, content architecture, AI Search knowledge graph, analytics charts, and fictional learner portrait. Inspect every result at original size before accepting it; regenerate artifacts with malformed hands, accidental text, logos, or poor crop.

- [ ] **Step 4: Optimize and write the manifest**

Convert accepted raster outputs to WebP with stable dimensions. The manifest records the exact prompt and target for every file; it must contain ten entries and no external URL.

- [ ] **Step 5: Implement prototype-led Home composition**

- Hero is independent of the first course record.
- Statistics strip contains the four approved metrics.
- Categories render every API record and use non-path language.
- Popular grid uses `courseResult.data.slice(0, 8)`, not `slice(1)`.
- Add generated illustrative testimonial section with HTML quote/name/disclaimer.
- Add latest published News section from `api.news({ page: 1 })`.
- Use local generated course images through the backend thumbnail field.

- [ ] **Step 6: Add and run the additive thumbnail migration**

Map existing published course thumbnails to the five generated subject families by category/track. `down()` restores the previous local SVG paths; do not touch non-demo custom thumbnails.

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan migrate --force
php artisan test tests/Feature/GeneratedDemoCatalogSeederTest.php tests/Feature/CompletedCourseDemoSeederTest.php
```

- [ ] **Step 7: Run GREEN, build, and visual source audit**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/Home.test.tsx --maxWorkers=1
npm run build
rg -n "picsum|unsplash|https?://" public/generated-images src/app/pages/Home.tsx
```

Expected: tests/build pass; source audit finds no generated-image hotlink.

- [ ] **Step 8: Reviewer gate**

Open every generated image and Home at both acceptance widths. Reject generic landscape imagery, garbled text, unlabeled fictional testimony, seven-card grids, or inaccurate category counts.

---

### Task 4: Prototype-led Course Catalog and real filtering

**Files:**
- Modify: `FE/DEMO/src/app/pages/CatalogPage.tsx`
- Modify: `FE/DEMO/src/app/pages/CatalogPage.test.tsx`
- Modify: `FE/DEMO/src/app/lib/api.ts`
- Modify: `BE/app/Http/Controllers/Api/CourseController.php`
- Modify: `BE/tests/Feature/Api/AuthAndCatalogTest.php`

**Interfaces:**
- `api.courses({ q, category, level, price, sort, page })`
- Supported `sort`: `newest | popular | price_asc | price_desc`
- Supported `price`: `all | free | paid`

- [ ] **Step 1: Add failing backend contract tests**

Create published courses with prices `0`, `100000`, and `300000`; request `/api/v1/courses?price=paid&sort=price_desc` and assert returned prices are `[300000, 100000]`. Add category, level, pagination, and unpublished-record exclusion assertions.

- [ ] **Step 2: Add failing frontend interaction tests**

Assert generated catalog hero, non-wrapping labels, complete controls, `price_desc` request, page reset after category/search change, URL query state, retry, and empty result.

- [ ] **Step 3: Run RED**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/AuthAndCatalogTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/CatalogPage.test.tsx src/app/lib/api.test.ts --maxWorkers=1
```

- [ ] **Step 4: Implement backend filters without N+1 queries**

Use conditional query clauses and an explicit sort map. Keep published status mandatory for public requests and eager-load category/count data already consumed by `CourseResource`.

- [ ] **Step 5: Recompose Catalog Page**

Render `/generated-images/catalog-hero.webp`, title **Khám phá khóa học**, one-row desktop filter bar, stable pagination, and API-backed states. Keep `Tìm kiếm` and select labels on one line with `whiteSpace: 'nowrap'`.

- [ ] **Step 6: Run GREEN and build**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/AuthAndCatalogTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/CatalogPage.test.tsx src/app/lib/api.test.ts --maxWorkers=1
npm run build
```

- [ ] **Step 7: Reviewer gate**

Verify exact ascending/descending ordering, page reset, URL state, and both-width layout. Do not accept client-only sorting of a single paginated page.

---

### Task 5: Prototype-led authentication copy and return flow

**Files:**
- Modify: `FE/DEMO/src/app/pages/AuthPage.tsx`
- Modify: `FE/DEMO/src/app/pages/AuthPage.test.tsx`
- Modify: `FE/DEMO/src/app/components/RequireAuth.test.tsx`

**Interfaces:**
- Consumes route state: `{ from?: string }`
- Produces Student redirect to `from ?? '/my-courses'`
- Produces Admin redirect to `/admin` regardless of Student-only return path

- [ ] **Step 1: Write failing copy/layout/redirect tests**

Assert the page does not contain **Tài khoản học tập**, does not contain **trong một tài khoản duy nhất**, contains a Marketing-learning success slogan, retains the two-column desktop layout, and returns a signed-in Student to `/cart` when that is the route state.

- [ ] **Step 2: Run RED**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/AuthPage.test.tsx src/app/components/RequireAuth.test.tsx --maxWorkers=1
```

- [ ] **Step 3: Implement approved copy and fixed desktop layout**

Remove responsive branches. Use a success-oriented message such as:

```text
Học Marketing thực chiến để biến kiến thức thành kết quả có thể đo lường.
```

Keep validation messages Vietnamese and preserve `ApiError.fields` handling.

- [ ] **Step 4: Protect Admin from Student return routes**

After login, route Admin to `/admin`; never route Admin to `/cart`, `/checkout`, `/my-courses`, or `/learn` even if stale location state contains one of those paths.

- [ ] **Step 5: Run GREEN and build**

```powershell
npm test -- src/app/pages/AuthPage.test.tsx src/app/components/RequireAuth.test.tsx --maxWorkers=1
npm run build
```

- [ ] **Step 6: Reviewer gate**

Inspect for developer language, old “one account” copy, mobile layout branches, or unsafe return-path behavior.

---

### Task 6: Separate Admin Portal and add real aggregate Dashboard

**Files:**
- Create: `FE/DEMO/src/app/pages/AdminOverview.tsx`
- Create: `FE/DEMO/src/app/pages/AdminOverview.test.tsx`
- Modify: `FE/DEMO/src/app/components/AdminShell.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.test.tsx`
- Modify: `FE/DEMO/src/app/routes.tsx`
- Modify: `FE/DEMO/src/app/lib/contracts.ts`
- Modify: `FE/DEMO/src/app/lib/api.ts`
- Modify: `BE/app/Http/Controllers/Api/Admin/DashboardController.php`
- Modify: `BE/tests/Feature/Api/AdminManagementTest.php`

**Interfaces:**
- Produces `ApiAdminStats`:

```ts
interface ApiAdminStats {
  students: number;
  courses: number;
  published_courses: number;
  enrollments: number;
  certificates: number;
  completion_rate: number;
  revenue: number;
  monthly_enrollments: Array<{ month: string; total: number }>;
  popular_courses: Array<{ id: number; title: string; enrollments_count: number }>;
}
```

- `AdminOverview({ stats }: { stats: ApiAdminStats }): JSX.Element`

- [ ] **Step 1: Write failing backend aggregate tests**

Seed enrollments across two months and multiple courses. Assert exact KPI totals, sorted monthly series, popular-course ordering, and `completion_rate: 0` when no enrollments exist.

- [ ] **Step 2: Write failing frontend shell/dashboard tests**

Assert `/admin` is outside `Layout`, Admin shell includes **Xem site public**, user-facing copy excludes `Admin Console`, `Quản trị SEONGON LMS`, `Laravel`, and `API`, and the dashboard renders KPI cards, chart labels, popular-course ranking, and empty state from `ApiAdminStats`.

- [ ] **Step 3: Run RED**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/AdminManagementTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/AdminOverview.test.tsx src/app/pages/AdminPage.test.tsx src/app/components/Layout.test.tsx --maxWorkers=1
```

- [ ] **Step 4: Extend Dashboard API with real series**

Aggregate the last twelve calendar months from real enrollment timestamps and return a stable ascending `YYYY-MM` series including zero months. Rank courses using `withCount('enrollments')`, descending count then title for deterministic ties. Do not use prototype arrays.

- [ ] **Step 5: Move Admin route outside Public `Layout`**

Create a top-level protected Admin route. `AdminShell` owns the full viewport sidebar/topbar and includes Public Site/Logout actions. Remove responsive row navigation and use fixed desktop columns.

- [ ] **Step 6: Implement `AdminOverview`**

Render KPI cards, an accessible monthly bar/line visualization, completion summary, and popular-course table. Provide textual values for every chart point and explicit empty states.

- [ ] **Step 7: Run GREEN and build**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/AdminManagementTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/AdminOverview.test.tsx src/app/pages/AdminPage.test.tsx src/app/components/Layout.test.tsx --maxWorkers=1
npm run build
```

- [ ] **Step 8: Authorization review**

Run Student and Guest requests against `/api/v1/admin/dashboard/stats`; both must return `403/401`. Confirm Admin Public Site header has no Student controls.

---

### Task 7: Admin Student and Course list-first tables

**Files:**
- Modify: `FE/DEMO/src/app/components/AdminDataTable.tsx`
- Modify: `FE/DEMO/src/app/components/AdminDataTable.test.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.test.tsx`
- Modify: `BE/app/Http/Controllers/Api/Admin/UserController.php`
- Modify: `BE/app/Http/Controllers/Api/Admin/CourseController.php`
- Modify: `BE/app/Http/Resources/AdminCourseResource.php`
- Modify: `BE/app/Http/Resources/UserResource.php`
- Modify: `BE/tests/Feature/Api/AdminManagementTest.php`

**Interfaces:**
- Student columns: `name, email, phone, enrollments_count, created_at, status, actions`
- Course columns: `title, category, level, price, lessons_count, questions_count, enrollments_count, status, actions`
- Filters apply only when the user presses **Áp dụng**; draft form state must not trigger requests.

- [ ] **Step 1: Add failing API aggregate/filter tests**

Assert User list includes `enrollments_count` and supports `q/status`; Course list includes lesson/question/enrollment counts and supports `q/status` without N+1 query growth.

- [ ] **Step 2: Add failing table parity tests**

Use Testing Library to assert exactly seven Student headers/cells and exactly nine Course headers/cells. Assert Course editor is absent initially, filters are white, Apply aligns with fields, status badge is not a button, and actions are contained in the final column.

- [ ] **Step 3: Run RED**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/AdminManagementTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/components/AdminDataTable.test.tsx src/app/pages/AdminPage.test.tsx --maxWorkers=1
```

- [ ] **Step 4: Implement query aggregates and resources**

Use `withCount`/`whenCounted` and a single Course aggregate query. Preserve pagination and applied query strings. Do not issue per-row detail calls from React.

- [ ] **Step 5: Implement fixed desktop table geometry**

Use explicit minimum widths, one intentional overflow container where necessary, stable header/cell definitions from the same column array, and matching right/center alignment for actions. Keep all cells reachable at `1280px` and `1440px`.

- [ ] **Step 6: Preserve management actions**

Course editor opens only through **Tạo khóa học** or edit. Preserve create/update, publish/hide, lesson/quiz, delete protection, status update, error retention, and success refresh.

- [ ] **Step 7: Run GREEN, lint, and build**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/AdminManagementTest.php
php -l app/Http/Controllers/Api/Admin/UserController.php
php -l app/Http/Controllers/Api/Admin/CourseController.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/components/AdminDataTable.test.tsx src/app/pages/AdminPage.test.tsx --maxWorkers=1
npm run build
```

- [ ] **Step 8: Reviewer gate**

At both acceptance widths, count headers and cells on at least five rows and compare action-column centers. Reject accidental clipping, duplicate filter requests, or hover states that imply false interaction.

---

### Task 8: Admin/Public News prototype lifecycle

**Files:**
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.test.tsx`
- Modify: `FE/DEMO/src/app/pages/NewsPage.tsx`
- Modify: `FE/DEMO/src/app/pages/NewsPage.test.tsx`
- Modify: `BE/app/Http/Controllers/Api/Admin/NewsController.php`
- Modify: `BE/app/Http/Controllers/Api/NewsController.php`
- Modify: `BE/tests/Feature/Api/NewsManagementTest.php`

**Interfaces:**
- Admin filters: `q`, `status`, `category`, `page`
- Public filters: `category`, `page`
- Mutation helper returns `Promise<boolean>` so editor resets only after success

- [ ] **Step 1: Add failing lifecycle and pagination tests**

Backend: create draft → publish → edit → public visible → draft/hidden → public absent → delete. Assert public pagination metadata and page reset behavior.

Frontend: failed mutation preserves fields/editor; successful mutation closes/resets; category change resets public page to 1; accessible pagination uses Vietnamese labels.

- [ ] **Step 2: Run RED**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/NewsManagementTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/AdminPage.test.tsx src/app/pages/NewsPage.test.tsx --maxWorkers=1
```

- [ ] **Step 3: Implement minimal alignment fixes**

Keep existing real CRUD. Align Admin nav wording to **Quản lý blog tin tức**, preserve success-only editor cleanup, keep applied filters stable, and make Public News reflect API category/page state.

- [ ] **Step 4: Run GREEN and build**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/NewsManagementTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/AdminPage.test.tsx src/app/pages/NewsPage.test.tsx --maxWorkers=1
npm run build
```

- [ ] **Step 5: Reviewer gate**

Check publish timestamp preservation, no duplicate/stale filter calls, error retention, public visibility, and delete confirmation.

---

### Task 9: Student My Courses and completed-certificate demo

**Files:**
- Modify: `FE/DEMO/src/app/pages/MyCoursesPage.tsx`
- Modify: `FE/DEMO/src/app/pages/MyCoursesPage.test.tsx`
- Modify: `FE/DEMO/src/app/components/GlobalHeader.tsx`
- Modify: `FE/DEMO/src/app/components/Layout.test.tsx`
- Modify: `BE/app/Http/Controllers/Api/Student/MyCourseController.php`
- Modify: `BE/app/Http/Resources/EnrollmentResource.php`
- Modify: `BE/database/seeders/CompletedCourseDemoSeeder.php`
- Modify: `BE/tests/Feature/Api/StudentLearningFlowTest.php`
- Modify: `BE/tests/Feature/CompletedCourseDemoSeederTest.php`

**Interfaces:**
- `GET /my/courses?page=N` returns paginated enrollments plus global `summary: { total, active, completed }`
- Filter order: `all`, `active`, `completed`
- Certificate download remains `GET /my/courses/{course}/certificate`

- [ ] **Step 1: Add failing frontend hierarchy tests**

Assert Student header has no standalone My Courses link, avatar contains Profile/My Courses/Logout, summary text order is label then number, filter order is exact, cards have white surfaces, and **Khám phá thêm** is contained.

- [ ] **Step 2: Add failing backend summary/seeder tests**

Create more enrollments than one page and assert global summary totals remain correct. Seed twice and assert exactly one completed enrollment, one passed attempt for the demo attempt number, complete lesson progress, and one certificate.

- [ ] **Step 3: Run RED**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/StudentLearningFlowTest.php tests/Feature/CompletedCourseDemoSeederTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/MyCoursesPage.test.tsx src/app/components/Layout.test.tsx --maxWorkers=1
```

- [ ] **Step 4: Implement only missing behavior**

Keep server global summary, eager-loaded certificate/course, PDF Blob download, and current expired-state guards. Adjust desktop composition and role controls without regressing those contracts.

- [ ] **Step 5: Run GREEN and certificate contract tests**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test tests/Feature/Api/StudentLearningFlowTest.php tests/Feature/CompletedCourseDemoSeederTest.php
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app/pages/MyCoursesPage.test.tsx src/app/components/Layout.test.tsx src/app/lib/api.test.ts --maxWorkers=1
npm run build
```

- [ ] **Step 6: Reviewer gate**

Verify Blob URL/click/revoke behavior, API-error alert/no click, expired CTA guard, no N+1 certificate query, and Admin exclusion from Student routes.

---

### Task 10: Full regression, live prototype comparison, and checklist evidence

**Files:**
- Modify during execution: `SPEC/course_platform_feedback_v2_manual_checklist.md`
- Create outside repo: `D:\CODE\seongon-lms-feedback-v2-evidence\<run-date>\...`
- Create outside repo: `D:\CODE\seongon-lms-feedback-v2-evidence\<run-date>\verification-report.md`

**Interfaces:**
- Evidence IDs and filenames are fixed by the manual checklist: `E01` through `E16`
- Final verdict is `PASS` only when all required checklist items pass

- [ ] **Step 1: Run fresh full backend verification**

```powershell
Set-Location 'D:\CODE\seongon-lms\BE'
php artisan test
```

Expected: exit `0`, zero failed tests. Record exact test/assertion totals.

- [ ] **Step 2: Run fresh deterministic frontend verification**

```powershell
Set-Location 'D:\CODE\seongon-lms\FE\DEMO'
npm test -- src/app --maxWorkers=1
npm run build
```

Expected: exit `0`, zero failed tests; production build succeeds. If the broad runner crawls unrelated scratch dependencies, enumerate exactly every `src/**/*.test.{ts,tsx}` file and record each result rather than weakening tests.

- [ ] **Step 3: Run static and database checks**

```powershell
Set-Location 'D:\CODE\seongon-lms'
git diff --check
rg -n "picsum|unsplash|placehold|TÀI KHOẢN HỌC TẬP|Laravel API|Admin Console" FE\DEMO\src FE\DEMO\public BE\database
Set-Location '.\BE'
php artisan migrate:status
```

Expected: diff check clean; search contains no forbidden current UI/assets; all required migrations show `Ran`.

- [ ] **Step 4: Start live stack and verify endpoints**

```powershell
Set-Location 'D:\CODE\seongon-lms'
.\Infra\start-local-web-windows.ps1 -NoBrowser
```

Confirm frontend, `/up`, categories, catalog, news, auth, Admin stats, My Courses, and certificate endpoints under correct authorization.

- [ ] **Step 5: Serve prototype and run browser checklist**

Serve `SPEC/seongon_learning_prototype_v3.html`, open prototype and current product in separate browser sessions, set exact viewports, and execute every item in `course_platform_feedback_v2_manual_checklist.md`.

- [ ] **Step 6: Capture and inspect E01–E16**

Use the exact evidence filenames. Open every screenshot at original size after capture and compare content, hierarchy, alignment, whitespace, typography, colors, images, tables, and role state. Record Mega Menu behavior with a short interaction capture in addition to still images.

- [ ] **Step 7: Complete traceability audit**

Programmatically confirm `FB-01` through `FB-45` each appear in the SPEC and manual checklist; manually link every item to passing evidence or an open defect. Do not mark pass based only on test names.

- [ ] **Step 8: Write final verification report**

The external report contains:

- Exact commit hash tested.
- Prototype and feedback SHA-256 hashes.
- Backend/frontend/build counts and exits.
- API/live endpoint results.
- Checklist pass/fail totals.
- Evidence file inventory.
- Open defects with severity and reproduction steps.
- Final `PASS` or `FAIL` verdict.

- [ ] **Step 9: Final review gate**

Run an independent whole-implementation review along correctness and test-coverage axes. Resolve every Critical/Important finding through a bounded RED → GREEN fix loop, rerun affected checks, then ask the product owner to inspect the actual evidence folder.

---

## Plan Completion Conditions

- Every task has its own RED evidence, GREEN evidence, reviewer verdict, and no unresolved Critical/Important finding.
- `FB-01…FB-45` have explicit automated/manual evidence.
- Both live roles and image comparisons are verified at the two acceptance viewports.
- The product owner reviews the completed manual checklist and evidence before any merge/push request is considered complete.

## Spec Coverage by Task

| Task | Feedback coverage |
|---|---|
| Task 1 | Desktop-only decision and `FB-18` |
| Task 2 | `FB-01`–`FB-07`, plus header portion of `FB-40` |
| Task 3 | `FB-08`–`FB-18` excluding the footer owned by Task 1 |
| Task 4 | `FB-13`, `FB-19`–`FB-21` |
| Task 5 | `FB-22`–`FB-23` |
| Task 6 | `FB-24`–`FB-28` |
| Task 7 | `FB-29`–`FB-38` |
| Task 8 | `FB-39` |
| Task 9 | `FB-40`–`FB-45` |
| Task 10 | Final runtime, image, role, and interaction evidence for `FB-01`–`FB-45` |
