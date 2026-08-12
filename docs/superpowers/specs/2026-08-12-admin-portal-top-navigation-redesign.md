# Admin Portal Top Navigation Redesign

**Date:** 2026-08-12  
**Status:** Awaiting specification approval  
**Scope:** Desktop-only `/admin` information architecture and visual redesign

## 1. Design read

This is an operations dashboard for SEONGON Academy administrators. It must feel direct, reliable, and data-rich rather than decorative. The implementation keeps the existing Material UI system and SEONGON teal/navy palette.

- `DESIGN_VARIANCE: 5`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 7`

## 2. Problem

The current Admin Portal reserves a fixed `248px` dark sidebar for six navigation actions. This reduces the usable table width, creates a visually heavy empty column, separates the public-site exit from account context, and makes the main content feel like a generic dashboard template. Some Admin tables then require more horizontal scrolling than their data alone warrants.

## 3. Goals

1. Remove the fixed left sidebar completely.
2. Give Admin content the full available desktop width without creating document-level horizontal overflow.
3. Make the six Admin sections immediately discoverable through a stable top navigation.
4. Preserve every current Admin operation, filter, form, loading state, error state, empty state, confirmation, and API contract.
5. Improve visual hierarchy and scanning at `1280×800` and `1440×900` with browser zoom `100%`.
6. Keep the Admin experience visually separate from the public Student header.

## 4. Non-goals

- No mobile Admin layout; the project-wide desktop-only gate remains authoritative below `1280px`.
- No backend endpoint or data-contract redesign.
- No new component library, chart package, icon family, or global state library.
- No change to Admin permissions or route authorization.
- No decorative animation, glassmorphism, AI-purple gradients, or generic stock imagery.

## 5. Information architecture

### 5.1 Admin application header

Replace the sidebar with a full-width Admin header containing:

- SEONGON Academy brand mark and `Admin Portal` product label on the left;
- `Xem site public` as a clearly labelled secondary action;
- current Admin identity and profile/logout affordance on the right.

The header uses a navy surface with sufficient contrast and a maximum height of `72px`. It is part of the Admin shell, not the public `GlobalHeader`.

### 5.2 Section navigation

Place a horizontal navigation row directly below the Admin header:

1. Tổng quan
2. Học viên
3. Danh mục
4. Khóa học
5. Đánh giá
6. Tin tức

Rules:

- Each section is a semantic button inside `nav[aria-label="Quản trị"]`.
- The active section uses `aria-pressed="true"`, a teal indicator, and a visible text-weight/color change.
- Navigation stays on one line at the supported desktop widths.
- Tabs do not use pill styling; the active indicator communicates location.
- Changing section preserves the existing local state and API-loading behavior.

### 5.3 Content frame

- The content area spans the page below navigation.
- Maximum content width: `1440px`, centered.
- Horizontal padding: `32px` at `1280px`, `40px` at `1440px` and above.
- Page-level `overflow-x` must remain absent.
- Wide tables may scroll only inside their labelled table wrapper.

## 6. Section header pattern

Each Admin section begins with one compact header row:

- left: section `h1` and one concise operational description;
- right: the section's primary action where one exists;
- no oversized repeated `ADMIN PORTAL` eyebrow;
- no duplicate generic `Vận hành SEONGON Academy` heading above every section.

Approved labels:

| Section | Heading | Description |
|---|---|---|
| Overview | Tổng quan vận hành | Theo dõi nhanh hoạt động học tập và hiệu quả nội dung. |
| Students | Quản lý học viên | Tìm kiếm, kiểm tra ghi danh và quản lý trạng thái tài khoản. |
| Categories | Danh mục khóa học | Tổ chức chủ đề để học viên khám phá nội dung dễ dàng. |
| Courses | Quản lý khóa học | Quản lý nội dung, bài học, bài kiểm tra và trạng thái xuất bản. |
| Reviews | Kiểm duyệt đánh giá | Theo dõi và kiểm soát đánh giá hiển thị trên hệ thống. |
| News | Tin tức và kiến thức | Biên tập nội dung công khai theo quy trình nháp và xuất bản. |

## 7. Overview dashboard

### 7.1 KPI strip

Display four KPIs in one row: Students, Courses, Enrollments, Revenue.

- Use a restrained white surface with a single top/accent rule rather than four generic floating cards.
- Label first, value second, supporting context only when real data exists.
- Values align consistently and do not wrap.
- Avoid decorative icons unless they add an accessible distinction using the project's existing Material icon family.

### 7.2 Analytics area

- Monthly enrollments occupy approximately two thirds of the row.
- Completion rate occupies the remaining third.
- The monthly chart retains real API values and accessible off-screen text.
- Bars use one teal scale and provide visible totals.
- Month labels remain readable without vertical text where space allows.
- Completion rate uses one large percentage, a labelled progress indicator, and certificate/enrollment context.

### 7.3 Popular courses

- Keep the real-data ranked table.
- Add clear rank emphasis without decorative medals or emoji.
- Course names receive the widest column.
- Enrollment values align right.
- Empty data uses the existing contextual empty state.

## 8. Management screens

### 8.1 Filter toolbar

Students, Courses, Reviews, and News use a consistent white toolbar:

- search field first;
- status/category controls second;
- `Áp dụng` after filters;
- primary create action aligned to the far right where applicable;
- controls share height and baseline;
- filter values do not submit until `Áp dụng`, preserving the existing request contract.

### 8.2 Tables

- Preserve the currently approved 7-column Student and 9-column Course contracts.
- Table header remains visible and has stronger contrast than body rows.
- Row hover communicates interactivity only where an action exists.
- Actions use consistent alignment and do not wrap.
- Table wrapper owns intentional horizontal scrolling at `1280px`; the document must not scroll horizontally.
- Empty state appears within the content surface, not as an isolated generic card.

### 8.3 Editors and confirmations

- Course and News editors remain closed initially.
- Editors open below the section header/filter toolbar and preserve all current fields and validation.
- Successful mutation closes/resets the editor according to current tested behavior.
- Failed mutation keeps the entered form state and renders its existing error message.
- Destructive actions continue to require explicit confirmation.

## 9. Visual system

- Existing `Be Vietnam Pro` typography remains.
- Navy is reserved for the Admin application header and primary text hierarchy.
- Teal is the single interaction/accent color.
- Page background uses the existing cool neutral.
- Surfaces use one documented radius scale: `12px` content surfaces, full-pill only for status chips.
- Shadows are subtle and cool-tinted; borders and spacing carry most hierarchy.
- Buttons keep minimum WCAG AA contrast and never wrap their labels.
- No right-side decorative rail, floating sidebar, or unused dark column may remain.

## 10. Motion and interaction

- Section content may use a `150–200ms` opacity/vertical transition when the active section changes.
- Hover and active feedback must communicate state, not decorate the page.
- All motion respects `prefers-reduced-motion`.
- Keyboard focus remains visible on navigation, actions, fields, and table controls.
- No continuous animation or scroll listener is allowed.

## 11. Component boundaries

- `AdminShell.tsx`: Admin header, horizontal section navigation, content frame, Admin identity/public-site exit.
- `AdminSectionHeader.tsx`: reusable section heading/description/action layout.
- `AdminOverview.tsx`: KPI strip, analytics area, and popular-course ranking.
- `AdminPage.tsx`: existing data orchestration, section content, filters, editors, and mutations.
- `AdminDataTable.tsx`: table structure and contained overflow; API and column definitions remain unchanged.

## 12. Accessibility

- One visible `h1` per active Admin section.
- Admin header, navigation, main content, tables, alerts, and dialogs retain semantic landmarks.
- Active navigation state is available through `aria-pressed` and not color alone.
- Chart retains an accessible name and a concise text equivalent for every month/value pair.
- Focus order follows header → navigation → section header → filters/actions → content.
- Color contrast meets WCAG AA.

## 13. Testing and visual evidence

### Automated RED/GREEN coverage

- `AdminShell` test proves the fixed sidebar/aside is absent.
- Test proves Admin brand/header, public-site action, account identity, ordered horizontal navigation, and active state.
- `AdminPage` tests prove all existing section operations remain available.
- `AdminOverview` tests prove the four real KPIs, analytics labels, completion context, ranking, and no document-width expansion regression.
- Existing Admin API tests remain unchanged and green unless a genuine UI contract requires a focused assertion update.

### Browser verification

Capture and inspect, not merely generate, these screenshots:

1. Overview at `1280×800` and `1440×900`.
2. Students at both viewports with all seven columns reachable.
3. Courses at both viewports with all nine columns reachable.
4. News list and open editor.
5. Empty/error state for one representative management section.

For every capture verify:

- no fixed sidebar or unused dark rail;
- no document-level horizontal scrollbar;
- navigation remains one line;
- header/action hierarchy is clear;
- table header/body column parity remains correct;
- all visible text is Vietnamese and purposeful;
- controls are neither clipped nor wrapped.

## 14. Definition of done

- The `248px` fixed sidebar is removed from `/admin`.
- All six Admin sections are reachable through the horizontal top navigation.
- Admin identity and `Xem site public` remain visible and usable.
- Dashboard and management screens use the full content width without document overflow.
- Existing Admin operations and real API data continue to work.
- Automated focused/full tests and production build pass.
- Required `1280×800` and `1440×900` screenshots have been opened and checked against the visual checklist.
- No second UI library, generic template sidebar, fake KPI, or decorative right rail is introduced.
