# Reference-Led System-Wide Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Guest, Student, and Admin presentation around the content density and layout rhythm of `onthisinhvien.com` while preserving SEONGON branding, routes, typed API contracts, and business behavior.

**Architecture:** Extend the existing MUI theme and extract focused presentation components around the current page-level API state. Public pages use a banner-first catalog composition, Student pages use a compact learning workspace, and Admin uses a dense management shell. No backend or route changes are required.

**Tech Stack:** React 18, React Router 7, MUI 7, TypeScript, Vite 8, Vitest 4, React Testing Library, Laravel, Docker Compose.

## Global Constraints

- Keep routes `/`, `/courses`, `/courses/:slug`, `/login`, `/checkout/:slug`, `/my-courses`, `/learn/:courseId`, `/profile`, and `/admin` unchanged.
- Keep existing API payloads, database schema, authentication storage, and payment mock contract unchanged.
- Keep `Be Vietnam Pro` self-hosted through `@fontsource/be-vietnam-pro`.
- Use teal as the only functional accent; restrict magenta to brand artwork.
- Use an 8 to 12px radius system, 1200 to 1280px content width, and 48 to 64px section spacing.
- Use only real API data for counts, reviews, ratings, and marketing claims.
- Do not add blog, cart, jobs, internships, combos, recruiter flows, endpoints, or database fields.
- Preserve unrelated changes in `README.md`, `SPEC/*`, and `data/*`.
- Keep JavaScript bundle growth below 5 percent.
- Use only opacity and transform for motion and honor `prefers-reduced-motion`.
- Meet WCAG AA contrast, keyboard navigation, and visible focus requirements.

---

### Task 1: Shared Theme and Global Shell

**Files:**
- Create: `FE/DEMO/src/app/components/GlobalHeader.tsx`
- Create: `FE/DEMO/src/app/components/SectionHeading.tsx`
- Modify: `FE/DEMO/src/app/theme.ts`
- Modify: `FE/DEMO/src/app/components/Layout.tsx`
- Modify: `FE/DEMO/src/app/components/PageHeader.tsx`
- Modify: `FE/DEMO/src/app/components/AsyncState.tsx`
- Modify: `FE/DEMO/src/app/components/StatusChip.tsx`
- Test: `FE/DEMO/src/app/components/Layout.test.tsx`
- Test: `FE/DEMO/src/app/components/AsyncState.test.tsx`

**Interfaces:**
- Produces: `GlobalHeader(): JSX.Element` using the existing `useAuth()` contract.
- Produces: `SectionHeading({ title, description, action, align? }): JSX.Element`.
- Produces: exported `layoutTokens` with `contentMaxWidth`, `sectionPadding`, and `headerHeight`.

- [ ] **Step 1: Write failing shell tests**

Add assertions that desktop navigation exposes Home, Courses, and Search; mobile navigation remains accessible; role links remain conditional; and async states expose `role="status"` or `role="alert"`.

```tsx
it('exposes reference-led discovery actions and role links', () => {
  renderLayout('/courses', 'admin');
  expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Khóa học' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Quản trị' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tìm kiếm khóa học' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and confirm the new assertion fails**

Run: `npm.cmd test -- src/app/components/Layout.test.tsx src/app/components/AsyncState.test.tsx --reporter=dot`

Expected: FAIL because the current header has no accessible search action and the new shell is not extracted.

- [ ] **Step 3: Implement the theme tokens and global header**

Use this public contract and token shape:

```tsx
export const layoutTokens = {
  contentMaxWidth: 1280,
  headerHeight: 72,
  sectionPadding: { xs: 6, md: 8 },
} as const;

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const links = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Khóa học', to: '/courses' },
    ...(user ? [{ label: 'Khóa học của tôi', to: '/my-courses' }] : []),
    ...(user?.role === 'admin' ? [{ label: 'Quản trị', to: '/admin' }] : []),
  ];

  return (
    <AppBar component="header" position="sticky" color="inherit" elevation={0}>
      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth }}>
        <Toolbar disableGutters sx={{ minHeight: layoutTokens.headerHeight, gap: 2 }}>
          <Link to="/" aria-label="Trang chủ"><Box component="img" src={logoSeongon} alt="" sx={{ width: 148 }} /></Link>
          <Stack component="nav" aria-label="Điều hướng chính" direction="row" sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
            {links.map((link) => <Button key={link.to} component={Link} to={link.to} aria-current={pathname === link.to ? 'page' : undefined}>{link.label}</Button>)}
          </Stack>
          <IconButton aria-label="Tìm kiếm khóa học" onClick={() => navigate('/courses')}><SearchRoundedIcon /></IconButton>
          {user ? <>
            <Button onClick={(event) => setMenuAnchor(event.currentTarget)}>{user.name}</Button>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MenuItem component={Link} to="/profile" onClick={() => setMenuAnchor(null)}>Hồ sơ</MenuItem>
              <MenuItem component={Link} to="/my-courses" onClick={() => setMenuAnchor(null)}>Khóa học của tôi</MenuItem>
              {user.role === 'admin' && <MenuItem component={Link} to="/admin" onClick={() => setMenuAnchor(null)}>Quản trị</MenuItem>}
              <MenuItem onClick={() => { setMenuAnchor(null); void logout(); }}>Đăng xuất</MenuItem>
            </Menu>
          </> : <Button component={Link} to="/login" variant="contained">Đăng nhập</Button>}
          <IconButton aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)} sx={{ display: { md: 'none' } }}>
            {mobileOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </IconButton>
        </Toolbar>
        {mobileOpen && <Stack component="nav" aria-label="Điều hướng di động">{links.map((link) => <Button key={link.to} component={Link} to={link.to} onClick={() => setMobileOpen(false)}>{link.label}</Button>)}</Stack>}
      </Container>
    </AppBar>
  );
}
```

Set body background to pale blue-gray, text to navy, buttons to 8px radius, cards to 10px radius, and content containers to the shared width. `Layout` renders `<GlobalHeader />`, `<Outlet />`, and the existing footer. `PageHeader` becomes a compact vertical stack. `SectionHeading` uses no eyebrow by default.

- [ ] **Step 4: Run focused tests**

Run: `npm.cmd test -- src/app/components/Layout.test.tsx src/app/components/AsyncState.test.tsx --reporter=dot`

Expected: PASS with all navigation, role, loading, and error assertions green.

- [ ] **Step 5: Commit the shared foundation**

```powershell
git add FE/DEMO/src/app/theme.ts FE/DEMO/src/app/components
git commit -m "feat: add reference-led LMS shell"
```

---

### Task 2: Banner-First Home and Dense Course Discovery

**Files:**
- Create: `FE/DEMO/src/app/components/HeroBanner.tsx`
- Create: `FE/DEMO/src/app/components/MetricsStrip.tsx`
- Modify: `FE/DEMO/src/app/components/CourseCard.tsx`
- Modify: `FE/DEMO/src/app/pages/Home.tsx`
- Test: `FE/DEMO/src/app/pages/Home.test.tsx`

**Interfaces:**
- Consumes: `ApiCourse`, `ApiCategory`, `layoutTokens`, and `SectionHeading`.
- Produces: `HeroBanner({ courses }: { courses: ApiCourse[] }): JSX.Element`.
- Produces: `MetricsStrip({ items }: { items: MetricItem[] }): JSX.Element`, where `MetricItem = { label: string; value?: string | number; icon: ReactNode }`.
- Produces: `CourseCard({ course, headingLevel?, compact? }): JSX.Element`.

- [ ] **Step 1: Expand the Home behavior test**

```tsx
it('renders a real-course banner and dense discovery sections', async () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(await screen.findByRole('region', { name: 'Khóa học nổi bật' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'SEO Foundation' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Danh mục khóa học' })).toBeInTheDocument();
  expect(screen.queryByText(/400k|30k|99%/i)).not.toBeInTheDocument();
  expect(api.courses).toHaveBeenCalledWith({ sort: 'popular' });
});
```

- [ ] **Step 2: Run the Home test and confirm failure**

Run: `npm.cmd test -- src/app/pages/Home.test.tsx --reporter=dot`

Expected: FAIL because `HeroBanner` and the labeled category navigation do not exist.

- [ ] **Step 3: Implement the banner, metric strip, and compact cards**

The banner selects up to three API courses and never invents copy or counts:

```tsx
export function HeroBanner({ courses }: { courses: ApiCourse[] }) {
  const featured = courses.slice(0, 3);
  const primary = featured[0];
  if (!primary) return null;
  const fallbackHeroImage = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=82';

  return (
    <Box component="section" aria-label="Khóa học nổi bật" sx={{ position: 'relative', overflow: 'hidden', minHeight: { xs: 520, md: 460 } }}>
      <Box component="img" src={primary.thumbnail ?? fallbackHeroImage} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(12,34,48,.94), rgba(12,34,48,.28))' }} />
      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, position: 'relative', color: 'white', py: { xs: 7, md: 9 } }}>
        <Typography component="h1" variant="h2">{primary.title}</Typography>
        <Button component={Link} to={`/courses/${primary.slug}`} variant="contained">Xem khóa học</Button>
      </Container>
    </Box>
  );
}

export function MetricsStrip({ items }: { items: MetricItem[] }) {
  return (
    <Box component="section" aria-label="Thông tin nền tảng" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' } }}>
        {items.map((item) => <Stack key={item.label} alignItems="center" spacing={1} sx={{ py: 3 }}>{item.icon}{item.value != null && <Typography variant="h5">{item.value}</Typography>}<Typography variant="body2">{item.label}</Typography></Stack>)}
      </Container>
    </Box>
  );
}
```

`Home` renders `HeroBanner`, a five-item factual capability strip, category navigation, popular courses, and the existing factual learning-benefit content. Course grids use four columns at `lg`, two at `sm`, and one at `xs`. Update the card signature to `CourseCard({ course, headingLevel = 'h3', compact = false }: { course: ApiCourse; headingLevel?: 'h2' | 'h3'; compact?: boolean })`; compact mode omits the long description.

- [ ] **Step 4: Run the Home test and production build**

Run: `npm.cmd test -- src/app/pages/Home.test.tsx --reporter=dot`

Expected: PASS.

Run: `npm.cmd run build`

Expected: exit code 0 with no TypeScript or Vite errors.

- [ ] **Step 5: Commit public discovery**

```powershell
git add FE/DEMO/src/app/components/HeroBanner.tsx FE/DEMO/src/app/components/MetricsStrip.tsx FE/DEMO/src/app/components/CourseCard.tsx FE/DEMO/src/app/pages/Home.tsx FE/DEMO/src/app/pages/Home.test.tsx
git commit -m "feat: rebuild home around dense course discovery"
```

---

### Task 3: Catalog, Course Detail, Auth, and Checkout

**Files:**
- Modify: `FE/DEMO/src/app/pages/CatalogPage.tsx`
- Modify: `FE/DEMO/src/app/pages/CoursePage.tsx`
- Modify: `FE/DEMO/src/app/pages/AuthPage.tsx`
- Modify: `FE/DEMO/src/app/pages/CheckoutPage.tsx`
- Test: `FE/DEMO/src/app/pages/CatalogPage.test.tsx`
- Test: `FE/DEMO/src/app/pages/CoursePage.test.tsx`
- Test: `FE/DEMO/src/app/pages/AuthPage.test.tsx`
- Test: `FE/DEMO/src/app/pages/CheckoutPage.test.tsx`

**Interfaces:**
- Consumes: existing `api.courses`, `api.course`, authentication, order, and payment methods without signature changes.
- Produces: search-first Catalog UI, sticky Course enrollment summary, and visually aligned Auth/Checkout layouts.

- [ ] **Step 1: Add focused structural assertions**

```tsx
expect(screen.getByRole('search', { name: 'Tìm khóa học' })).toBeInTheDocument();
expect(screen.getByRole('complementary', { name: 'Bộ lọc khóa học' })).toBeInTheDocument();
expect(await screen.findByRole('complementary', { name: 'Thông tin đăng ký' })).toBeInTheDocument();
```

Keep existing behavioral assertions for query parameters, course loading, login, checkout payloads, and payment outcomes.

- [ ] **Step 2: Run the four page tests and confirm structural failures**

Run: `npm.cmd test -- src/app/pages/CatalogPage.test.tsx src/app/pages/CoursePage.test.tsx src/app/pages/AuthPage.test.tsx src/app/pages/CheckoutPage.test.tsx --reporter=dot`

Expected: new region assertions FAIL while existing API behavior remains green.

- [ ] **Step 3: Implement reference-led page compositions**

Catalog uses a semantic search and filter layout:

```tsx
<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' }, gap: 3 }}>
  <Box component="aside" aria-label="Bộ lọc khóa học">{filterControls}</Box>
  <Box>
    <Box component="form" role="search" aria-label="Tìm khóa học">{searchField}</Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>{courseCards}</Box>
  </Box>
</Box>
```

Course Detail uses `gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 360px' }`; the enrollment card has `position: { md: 'sticky' }` and `top: 96`. Auth uses a two-column banner and form composition. Checkout uses order details and payment controls in a main plus sticky summary grid. Preserve exact form fields and submission bodies.

- [ ] **Step 4: Run focused tests and build**

Run: `npm.cmd test -- src/app/pages/CatalogPage.test.tsx src/app/pages/CoursePage.test.tsx src/app/pages/AuthPage.test.tsx src/app/pages/CheckoutPage.test.tsx --reporter=dot`

Expected: PASS with unchanged API mock assertions.

Run: `npm.cmd run build`

Expected: exit code 0.

- [ ] **Step 5: Commit Guest page redesigns**

```powershell
git add FE/DEMO/src/app/pages/CatalogPage.tsx FE/DEMO/src/app/pages/CoursePage.tsx FE/DEMO/src/app/pages/AuthPage.tsx FE/DEMO/src/app/pages/CheckoutPage.tsx FE/DEMO/src/app/pages/CatalogPage.test.tsx FE/DEMO/src/app/pages/CoursePage.test.tsx FE/DEMO/src/app/pages/AuthPage.test.tsx FE/DEMO/src/app/pages/CheckoutPage.test.tsx
git commit -m "feat: align guest flows with reference layout"
```

---

### Task 4: Student Dashboard and Learning Workspace

**Files:**
- Create: `FE/DEMO/src/app/components/StudentWorkspaceShell.tsx`
- Modify: `FE/DEMO/src/app/pages/MyCoursesPage.tsx`
- Modify: `FE/DEMO/src/app/pages/LearnCoursePage.tsx`
- Modify: `FE/DEMO/src/app/pages/ProfilePage.tsx`
- Test: `FE/DEMO/src/app/pages/MyCoursesPage.test.tsx`
- Test: `FE/DEMO/src/app/pages/LearnCoursePage.test.tsx`
- Test: `FE/DEMO/src/app/pages/ProfilePage.test.tsx`

**Interfaces:**
- Produces: `StudentWorkspaceShell({ curriculum, content, aside }): JSX.Element`.
- Consumes: existing `ApiEnrollment`, `ApiLesson`, `ApiProgress`, `ApiQuiz`, and profile methods.
- Preserves: completion, quiz, review, certificate, and profile mutation payloads.

- [ ] **Step 1: Add failing student hierarchy tests**

```tsx
expect(await screen.findByRole('region', { name: 'Tiến độ học tập' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Đang học' })).toHaveAttribute('aria-pressed', 'true');
expect(await screen.findByRole('navigation', { name: 'Nội dung khóa học' })).toBeInTheDocument();
expect(screen.getByRole('complementary', { name: 'Tiến độ và tài nguyên' })).toBeInTheDocument();
```

- [ ] **Step 2: Run student tests and confirm failure**

Run: `npm.cmd test -- src/app/pages/MyCoursesPage.test.tsx src/app/pages/LearnCoursePage.test.tsx src/app/pages/ProfilePage.test.tsx --reporter=dot`

Expected: hierarchy assertions FAIL; existing API and mutation tests remain green.

- [ ] **Step 3: Implement the student layouts**

Use this shell contract:

```tsx
export function StudentWorkspaceShell({ curriculum, content, aside }: {
  curriculum: ReactNode;
  content: ReactNode;
  aside: ReactNode;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr) 280px' }, gap: 2.5 }}>
      <Box component="nav" aria-label="Nội dung khóa học">{curriculum}</Box>
      <Box component="section">{content}</Box>
      <Box component="aside" aria-label="Tiến độ và tài nguyên">{aside}</Box>
    </Box>
  );
}
```

My Courses adds derived filters `all | active | completed` without changing server data. Progress summaries are computed from `enrollment.progress`. Learn Course places current lesson and quiz in `content`, lessons in `curriculum`, and progress/certificate/review actions in `aside`. Profile uses grouped account, learning summary, and security sections while preserving current mutation handlers.

- [ ] **Step 4: Run student tests and build**

Run: `npm.cmd test -- src/app/pages/MyCoursesPage.test.tsx src/app/pages/LearnCoursePage.test.tsx src/app/pages/ProfilePage.test.tsx --reporter=dot`

Expected: PASS.

Run: `npm.cmd run build`

Expected: exit code 0.

- [ ] **Step 5: Commit Student surfaces**

```powershell
git add FE/DEMO/src/app/components/StudentWorkspaceShell.tsx FE/DEMO/src/app/pages/MyCoursesPage.tsx FE/DEMO/src/app/pages/LearnCoursePage.tsx FE/DEMO/src/app/pages/ProfilePage.tsx FE/DEMO/src/app/pages/MyCoursesPage.test.tsx FE/DEMO/src/app/pages/LearnCoursePage.test.tsx FE/DEMO/src/app/pages/ProfilePage.test.tsx
git commit -m "feat: add dense student learning workspace"
```

---

### Task 5: Admin Management Shell and Dense Data Views

**Files:**
- Create: `FE/DEMO/src/app/components/AdminShell.tsx`
- Create: `FE/DEMO/src/app/components/AdminDataTable.tsx`
- Modify: `FE/DEMO/src/app/pages/AdminPage.tsx`
- Test: `FE/DEMO/src/app/pages/AdminPage.test.tsx`

**Interfaces:**
- Produces: `AdminShell({ active, onChange, children }): JSX.Element` for the five existing sections.
- Produces: `AdminDataTable({ label, columns, rows, getRowKey }): JSX.Element` using typed render callbacks.
- Preserves: all admin API calls, quiz editing, lesson ordering, filtering, pagination, and mutations.

- [ ] **Step 1: Add failing shell and destructive-action tests**

```tsx
expect(await screen.findByRole('navigation', { name: 'Quản trị' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'false');
await user.click(screen.getByRole('button', { name: 'Khóa học' }));
expect(screen.getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'true');
```

For a delete path, assert a dialog names the selected course or category before the existing API mutation fires.

- [ ] **Step 2: Run Admin tests and confirm failure**

Run: `npm.cmd test -- src/app/pages/AdminPage.test.tsx --reporter=dot`

Expected: new navigation and confirmation assertions FAIL; existing quiz-load and lesson-order tests stay green.

- [ ] **Step 3: Implement AdminShell and AdminDataTable**

```tsx
type AdminSection = 'overview' | 'users' | 'categories' | 'courses' | 'reviews';

interface AdminShellProps {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  children: ReactNode;
}

const adminSections = [
  ['overview', 'Dashboard'],
  ['users', 'Người dùng'],
  ['categories', 'Danh mục'],
  ['courses', 'Khóa học'],
  ['reviews', 'Đánh giá'],
] as const;

export function AdminShell({ active, onChange, children }: AdminShellProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '240px minmax(0, 1fr)' }, gap: 3 }}>
      <Stack component="nav" aria-label="Quản trị">
        {adminSections.map(([value, label]) => (
          <Button key={value} aria-pressed={active === value} onClick={() => onChange(value)}>{label}</Button>
        ))}
      </Stack>
      <Box>{children}</Box>
    </Box>
  );
}

export type AdminColumn<T> = {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
};

export function AdminDataTable<T>({ label, columns, rows, getRowKey }: {
  label: string;
  columns: AdminColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
}) {
  return (
    <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
      <Table size="small" aria-label={label}>
        <TableHead><TableRow>{columns.map((column) => <TableCell key={column.key} align={column.align}>{column.header}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map((row) => <TableRow key={getRowKey(row)} hover>{columns.map((column) => <TableCell key={column.key} align={column.align}>{column.render(row)}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </TableContainer>
  );
}
```

`AdminDataTable` wraps MUI `TableContainer`, `Table`, `TableHead`, and `TableBody` and uses a controlled horizontal container on tablet. AdminPage retains its existing state and handlers, replaces top Tabs with `AdminShell`, uses tables for Users/Courses/Reviews, and adds named confirmation dialogs for destructive mutations. On small screens, critical row labels remain visible and the table container scrolls without page overflow.

- [ ] **Step 4: Run Admin tests with scoped timeout and build**

Run: `npm.cmd test -- src/app/pages/AdminPage.test.tsx --reporter=dot`

Expected: PASS. If the two existing integration cases only time out under the full suite, set `10_000` on those individual `it(...)` calls and do not change global timeout.

Run: `npm.cmd run build`

Expected: exit code 0.

- [ ] **Step 5: Commit Admin surfaces**

```powershell
git add FE/DEMO/src/app/components/AdminShell.tsx FE/DEMO/src/app/components/AdminDataTable.tsx FE/DEMO/src/app/pages/AdminPage.tsx FE/DEMO/src/app/pages/AdminPage.test.tsx
git commit -m "feat: redesign admin management workspace"
```

---

### Task 6: Full Verification and Browser Acceptance

**Files:**
- Modify only if verification exposes a regression: the smallest affected file and its focused test.
- Do not modify: `BE/routes/api.php`, database migrations, `data/*`, or prototype-only pages.

**Interfaces:**
- Consumes all deliverables from Tasks 1 through 5.
- Produces a verified Dockerized UI with unchanged backend behavior.

- [ ] **Step 1: Run the full frontend test suite twice**

Run from `FE/DEMO`:

```powershell
npm.cmd test -- --reporter=dot
npm.cmd test -- --reporter=dot
```

Expected: both runs pass with zero failed tests.

- [ ] **Step 2: Build and compare bundle size**

```powershell
npm.cmd run build
```

Expected: exit code 0. Compare generated JS bytes with the pre-redesign baseline and confirm growth is at most 5 percent.

- [ ] **Step 3: Run backend regression tests**

Run from `BE`:

```powershell
php artisan test --testdox
```

Expected: zero failures.

- [ ] **Step 4: Rebuild Docker and verify health**

Run from the repository root:

```powershell
docker compose --env-file Infra/.env -f Infra/docker-compose.yml up -d --build
docker compose --env-file Infra/.env -f Infra/docker-compose.yml ps
```

Expected: `mysql`, `app`, and `nginx` report healthy; `http://localhost` responds.

- [ ] **Step 5: Complete browser smoke tests**

Use the in-app Browser at 1440x900 and 390x844. Verify:

```text
Guest: Home banner -> category -> catalog search/filter -> course detail -> login -> checkout
Student: login -> My Courses filters -> learning workspace -> lesson completion -> quiz/review/certificate states -> profile
Admin: login -> Dashboard -> Users -> Categories -> Courses/content/quiz -> Reviews
Accessibility: keyboard-only navigation, visible focus, AA contrast, no page-level horizontal overflow
States: loading, error, empty, disabled, success, destructive confirmation
```

Expected: all flows remain functional and the layout density is visibly aligned with the approved reference direction.

If a smoke check fails, return to the owning task, add or update the focused regression test, implement the smallest fix, rerun that task's checks, and then repeat all six verification steps.
