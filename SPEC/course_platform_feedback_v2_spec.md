# SEONGON Learning — Prototype-led UI/UX Feedback Specification v2

**Status:** Draft for product-owner review  
**Date:** 2026-08-12  
**Implementation target:** `FE/DEMO` + supporting Laravel API in `BE`  
**Primary feedback source:** `SPEC/feedback_cleaned.md`  
**Prototype reference:** `SPEC/seongon_learning_prototype_v3.html`  
**Manual acceptance:** `SPEC/course_platform_feedback_v2_manual_checklist.md`

## 1. Purpose

This specification converts all 45 cleaned feedback items into a testable desktop product contract. The completed product must be compared with the prototype visually and behaviorally at the same viewport; source-code similarity alone is not acceptance evidence.

## 2. Authority and conflict resolution

Apply sources in this order:

1. The product owner's latest explicit instruction.
2. Prototype logic: navigation, role behavior, workflow, layout hierarchy, and interaction logic in `seongon_learning_prototype_v3.html`.
3. `feedback_cleaned.md`, including every item from `FB-01` through `FB-45`.
4. The current React/Laravel implementation.

The prototype is a behavioral and visual reference, not a source of production data. Live Laravel API data remains authoritative for users, roles, categories, courses, cart state, enrollments, progress, certificates, news, and Admin aggregates.

## 3. Approved scope decisions

### 3.1 Desktop-only product

- The supported viewport width starts at `1280px`.
- Acceptance viewports are `1280×800` and `1440×900`, at browser zoom `100%`.
- Remove mobile navigation, hamburger controls, mobile-only layouts, and mobile acceptance tests.
- At viewport widths below `1280px`, replace the application surface with a clear notice: **“Vui lòng sử dụng màn hình máy tính để có trải nghiệm đầy đủ.”**
- The unsupported-screen notice must not expose a broken, compressed, or horizontally overflowing application behind it.

### 3.2 Prototype fidelity

The product must follow the prototype for:

- Information architecture and page hierarchy.
- Role-specific navigation and control visibility.
- Ordering and hierarchy of sections.
- Primary layouts, tables, cards, filters, and CTA placement.
- Interaction behavior and user flow.

Pixel-perfect duplication is not required. The implementation may preserve existing accessible components and real API contracts when the resulting appearance and behavior still satisfy this specification.

### 3.3 Generated visual content

- New course, hero, and decorative illustrations must be created with `imagegen` and stored locally.
- Do not hotlink external images or copy assets from third-party websites.
- Generated course images must use a consistent `16:9` ratio and depict SEO, Google Ads, Content, AI Search, analytics, or Marketing learning.
- Course illustrations must not contain AI-rendered text, fake logos, fake awards, or fake certificates.
- Fictional testimonial content is permitted for the demo, but every testimonial section/card must visibly display **“Nội dung minh họa”**.
- Testimonial portraits/backgrounds may be generated with `imagegen`; quotes and names must be rendered as HTML text, not baked into images.

## 4. Global visual system

### 4.1 Desktop shell

- Use a centered content container with a maximum width of approximately `1280px` and at least `24px` horizontal padding.
- Sections must have deliberate vertical rhythm; unrelated content must not appear as one continuous block.
- Cards in one grid row must align at the top and use consistent height behavior.
- Never leave an accidental missing grid cell when enough real records exist to fill the configured row.
- Interactive controls must provide visible `hover`, `focus-visible`, `active`, `disabled`, `loading`, `empty`, and `error` states where applicable.

### 4.2 Language and content

- User-facing copy must use Vietnamese business language.
- Do not expose implementation terms such as `Laravel API`, internal status names, database concepts, or developer diagnostics.
- Do not describe independent courses as a mandatory “lộ trình” unless the underlying data represents a real ordered learning path.

### 4.3 Images

- Every course card must use a relevant generated image or approved local asset.
- No random landscape, generic city, or unrelated stock image is allowed.
- Images must have stable dimensions to avoid layout shift and meaningful Vietnamese `alt` text where content-bearing.

## 5. Desktop public header

### 5.1 Layout

- Header remains sticky at the top and uses a solid or lightly translucent high-contrast background.
- Use the real SEONGON logo, rendered at `44–48px` high with proportional width. It must be visibly larger than the current small logo without clipping.
- Logo aligns to the far left of the content container.
- Primary navigation and account actions occupy the right side with consistent spacing.
- Public navigation order: **Trang chủ → Khóa học → Tin tức**.
- The current route uses brand-colored text plus a `2px` underline. Do not use the existing filled light-blue rectangle for active state.

### 5.2 Courses Mega Menu

The desktop menu item **Khóa học** is the `Courses Trigger`.

Required behavior:

1. `mouseenter` on the Courses Trigger opens the Mega Menu; click is not the open trigger.
2. Keyboard focus on the Courses Trigger also opens the menu.
3. Opening animation combines `opacity: 0 → 1` and a short downward translation such as `translateY(-8px) → 0` over `200ms`.
4. Moving the pointer from the trigger into the panel keeps it open without flicker.
5. Leaving both trigger and panel starts a `200ms` close delay.
6. Re-entering either region before the delay expires cancels closing.
7. `Escape` closes the panel and restores focus to the Courses Trigger.
8. Clicking the **Khóa học** label navigates to `/courses`; it does not toggle the menu.
9. Clicking a category navigates to `/courses?category=<slug>`.

Mega Menu content:

- **Tất cả khóa học**.
- Every currently published category returned by the API.
- Category names and slugs must not be hard-coded.
- Loading state: stable panel skeleton or progress indicator without changing panel width.
- Error state: show **“Không thể tải danh mục”** and retain the **Tất cả khóa học** route.
- Empty state: show **“Chưa có danh mục khóa học”** and retain the **Tất cả khóa học** route.

Accessibility contract:

- Trigger exposes `aria-haspopup`, `aria-expanded`, and `aria-controls`.
- Panel has a stable `id` and a semantic menu/navigation relationship.
- All links are reachable in a logical tab order.
- Reduced-motion preference removes translation and shortens or removes animation without changing functionality.

### 5.3 Role matrix

| Control | Guest | Student | Admin on Public Site |
|---|---:|---:|---:|
| Trang chủ / Khóa học / Tin tức | Yes | Yes | Yes |
| Search | Yes | Yes | Yes |
| Cart entry point | Yes | Yes, with badge | No |
| Notification | No | Yes | No |
| Đăng nhập | Yes | No | No |
| Đăng ký | Yes | No | No |
| Avatar | No | Yes | Yes |
| My Courses in avatar menu | No | Yes | No |
| Admin Portal in avatar menu | No | No | Yes |
| Standalone My Courses navigation link | No | No | No |

Guest Cart behavior:

- The cart entry point is visible even when signed out.
- Opening it routes to the cart/sign-in requirement, not to a missing page.
- Display a clear sign-in CTA and preserve the intended return route.
- Guest cart persistence is out of scope; Student cart ownership remains per authenticated user.

## 6. Public home page

### 6.1 Hero

- Follow the prototype's two-column desktop hierarchy: value proposition and CTAs on the left; a strong generated Marketing-learning visual on the right.
- Primary headline communicates **“Nền tảng học tập Marketing thực chiến”** or an approved equivalent.
- Supporting copy communicates SEO, Google Ads, Content SEO, and AI Search learning from SEONGON.
- Do not use an internal course code such as “SEO AI Max 01” as the primary page proposition.
- Primary CTA: **Khám phá khóa học**.
- Secondary CTA: **Đăng ký học thử** or **Đăng ký**.

### 6.2 Statistics strip

Replace the five non-interactive feature icons with the prototype-style statistics strip:

- `14+ năm` — Kinh nghiệm Search Marketing.
- `2.500+` — Khách hàng đồng hành.
- `6` — Nhóm khóa học chuyên sâu.
- `100%` — Thực chiến từ SEONGON.

These values are approved content for this implementation. The items must look informational, not clickable.

### 6.3 Categories

- Heading and description must refer to **danh mục/chủ đề**, not a guaranteed learning path.
- Render every published category returned by the API.
- Each category card shows name and published course count.
- Category cards must fill the desktop grid without an avoidable empty right-hand region.
- **Xem tất cả** must have a visually prominent CTA treatment and navigate to `/courses`.

### 6.4 Popular courses

- Request popular published courses from the API.
- Render up to eight real records.
- At `1440px`, eight records form a balanced `4 × 2` grid.
- Do not create fake courses to fill the grid. If fewer than eight real records exist, use a centered/rebalanced layout that does not resemble a missing card.
- Each card uses a relevant local generated image and consistent content hierarchy.

### 6.5 Testimonials

- Include a social-proof section inspired by the prototype/reference imagery.
- Every fictional item visibly includes **Nội dung minh họa**.
- Use generated portraits or abstract profile imagery without imitating real people.
- Render testimonial quote, fictional name, course context, and disclaimer as HTML.
- Do not show fabricated company logos, numerical outcomes, or verification badges.

### 6.6 News and footer

- Include a latest-news section with published API data and a prominent **Xem tất cả bài viết** link.
- Footer follows the prototype's four-column hierarchy: brand summary, course discovery, support/account links, and contact/policy information.
- Footer must be materially taller and more informative than the current short footer.
- Remove links the current role cannot access or redirect them through the correct authentication flow.

## 7. Course catalog

### 7.1 Hero and imagery

- Replace the text-only “Tìm đúng lộ trình cho mục tiêu của bạn” block with a large generated `16:9` Marketing-learning banner aligned to the prototype's visual hierarchy.
- Use a concise title such as **Khám phá khóa học** and avoid implying an ordered path.

### 7.2 Search, filters, and sorting

Required controls:

- Search by course name.
- Published category.
- Level.
- Price type: all, free, paid.
- Sort: newest, popular, price ascending, price descending.

Behavior:

- **Giá giảm dần** maps to the API's descending-price sort contract.
- Search and filter labels never wrap; **Tìm kiếm** remains on one line.
- Changing search/category/sort resets pagination to page 1.
- Query state is reflected in the URL where supported.
- Loading, error with retry, empty results, and pagination states are explicit.
- Course cards use real API fields and relevant generated images.

## 8. Authentication

- Desktop uses the prototype's two-column auth layout: branded learning visual/message plus the form.
- Remove the eyebrow/label **Tài khoản học tập** before **Chào mừng bạn!**.
- Replace generic “one account” copy with a concise Marketing-learning success message.
- Guest header exposes both **Đăng nhập** and **Đăng ký**.
- After sign-in, route Student to the intended return route or My Courses and Admin to Admin Portal.
- Validation and server errors appear near the form in Vietnamese and do not expose raw server details.

## 9. Admin Portal

### 9.1 Separation from Public Site

- Admin Portal uses its own sidebar/topbar shell, following the prototype.
- Do not reuse the Student public header inside the Admin Portal.
- Sidebar includes **Xem site public**.
- Remove `Admin Console`, oversized `Quản trị SEONGON LMS`, and developer-facing `Laravel API` text.
- Admin never sees Student cart, notification, checkout, or My Courses controls.

### 9.2 Dashboard

- Show useful KPI cards plus at least one time-series/chart and one ranked-course/table view as in the prototype.
- All figures come from aggregate API responses; no prototype arrays or hard-coded trends are allowed.
- Minimum aggregates: Student count, Course count, Enrollment count, Completion rate, revenue where supported, review/news activity where supported, monthly enrollment series, and popular-course ranking.
- If a metric is unavailable, omit it or show an explicit unavailable state; never invent live business data.
- Charts include text labels/accessible summaries and meaningful empty states.

### 9.3 Student management

- Filter/search controls use white high-contrast surfaces.
- **Áp dụng** uses balanced padding and consistent height with adjacent fields.
- Table contains exactly these visible columns: **Học viên**, **Email**, **SĐT**, **Khóa đã đăng ký**, **Ngày tạo**, **Trạng thái**, **Thao tác**.
- Header/body column counts and alignment match on every row.
- Status is a non-interactive badge unless a clearly labelled action is present in **Thao tác**.
- Hover styling must not imply that a non-clickable status badge is clickable.
- The table may use a deliberate horizontal scroll container only if every header and cell remains reachable and aligned. No clipping is allowed.

### 9.4 Course management

- Page is list-first; the create/edit form is closed initially.
- Primary action **Tạo khóa học** opens the editor only when requested.
- Preserve search, status filtering, and **Áp dụng** behavior.
- Table columns follow prototype hierarchy: **Khóa học**, **Danh mục**, **Cấp độ**, **Học phí**, **Bài học**, **Câu hỏi**, **Đăng ký**, **Trạng thái**, **Thao tác**.
- Header/body parity is mandatory; the **Thao tác** header and row actions must share alignment.
- Preserve valid actions such as edit, publish/hide, delete, and lesson/quiz management according to permissions and API contracts.
- Avoid accidental clipping at both acceptance viewports.

### 9.5 News management

- Admin Portal includes **Quản lý blog tin tức**.
- Support list, search, category/status filters, create draft, edit, publish, hide/move to draft, and confirmed delete.
- Failed mutations keep the editor open and retain entered data.
- Successful mutations refresh the list and reset/close the editor as appropriate.
- Public News displays only published posts, supports category filtering and pagination, and reflects publish/hide changes.

## 10. Student experience

### 10.1 Header account controls

- Student sees Notification, Cart badge, and avatar.
- **Khóa học của tôi** appears only inside the avatar menu, not as primary navigation.
- Avatar menu includes at least **Hồ sơ**, **Khóa học của tôi**, and **Đăng xuất**; Cart may remain a header control rather than a duplicate menu item.

### 10.2 My Courses

- Summary cards display label first and number second:
  - **Tổng khóa học**.
  - **Đang học**.
  - **Đã hoàn thành**.
- Cards have distinct white surfaces and do not bleed into the page background.
- Filter order is **Tất cả → Đang học → Đã hoàn thành**.
- Summary counts use global server totals and do not change incorrectly because only one pagination page is loaded.
- **Khám phá thêm** uses the primary contained CTA style.
- Loading, error, empty, active, completed, and expired states remain visually distinct.

### 10.3 Completed demo and certificate

- Seed at least one idempotent completed enrollment for the demo Student.
- Progress is `100%`, final assessment is passed, and a certificate exists.
- The completed card shows **Tải chứng chỉ**.
- Download returns a valid PDF; expired enrollment does not expose learning/certificate CTAs when business rules forbid them.

## 11. Data and API requirements

The implementation may extend Laravel endpoints where required by this specification. Required contracts include:

- Published categories with slug and published course count.
- Course catalog search, category, level, price type, sort, and pagination.
- Popular-course ordering.
- Public news category and pagination.
- Role-aware authenticated user information.
- Student-owned cart reconciliation against current course data.
- My Courses global summary plus paginated enrollment records.
- Admin Student list with enrollment count.
- Admin Course list with lesson/question/enrollment counts.
- Admin dashboard aggregates and chart series.
- Admin News CRUD/status lifecycle.
- Certificate PDF download.

Authorization must be enforced by Laravel, not only hidden in React. Guest cannot access Student APIs, Student cannot access Admin APIs, and Admin cannot use Student enrollment/cart endpoints.

## 12. `imagegen` production briefs

Create a consistent visual family rather than unrelated one-off images.

| Asset family | Required direction | Exclusions |
|---|---|---|
| Home hero | Premium Vietnamese Marketing academy, abstract search/analytics interfaces, SEONGON-inspired teal/navy/magenta palette, spacious composition | Text, third-party logos, certificates |
| SEO courses | Search graph, keyword clusters, technical audit motifs | Generic nature/landscape images |
| Google Ads courses | Campaign structure, charts, conversion funnel | Google trademark imitation, readable UI text |
| Content SEO | Editorial planning, content architecture, document motifs | AI-generated paragraphs or fake headlines |
| AI Search | Human-led AI research, knowledge graph, answer-engine motifs | Robot clichés, glowing brain clichés |
| Analytics | Measurement dashboard motifs, clean charts, reporting | Fake performance numbers or brand badges |
| Testimonials | Diverse fictional adult learner portraits or abstract avatars; consistent neutral background | Real-person likeness, company logos, text embedded in image |

Every generated file must have a descriptive local filename, documented prompt, `16:9` crop for course/hero imagery, and visual review at actual card size before acceptance.

## 13. Quality requirements

### 13.1 Accessibility

- All interactive elements work with keyboard.
- Visible `focus-visible` indication meets contrast requirements.
- Menus, dialogs, tabs, tables, status messages, and pagination expose appropriate semantics.
- Color is not the only carrier of state.
- Generated content has suitable alternative text or is marked decorative.

### 13.2 Performance and stability

- Generated images are optimized and served locally.
- Image dimensions prevent cumulative layout shift.
- Mega Menu category requests are cached or reused to prevent repeated flicker on every hover.
- No uncaught console error, failed network request, or error banner is allowed in the acceptance flows.

### 13.3 Automated coverage

At minimum, automated tests must cover:

- Desktop width gate and absence of mobile navigation.
- Mega Menu mouse enter, retention, delayed close/cancel, keyboard focus, `Escape`, category routing, and error/empty states.
- Guest/Student/Admin header matrix.
- Home category/popular-course limits and all error states.
- Catalog price-descending sort and query reset.
- Admin aggregate contracts, Student/Course table column parity, and News lifecycle.
- My Courses summary/filter order/completed certificate behavior.
- Backend role authorization for Admin and Student endpoints.

## 14. Traceability matrix

| Feedback | Required implementation | Prototype/manual anchor |
|---|---|---|
| FB-01 | Logo height `44–48px`, proportional and unclipped | Public header comparison |
| FB-02 | Active link uses brand text + `2px` underline, no filled rectangle | Header states |
| FB-03 | Hover/focus Courses Mega Menu with API categories | Mega Menu flow |
| FB-04 | Logo left; navigation/actions right | Public header layout |
| FB-05 | Guest Cart visible; sign-in requirement on entry | Guest role flow |
| FB-06 | Guest Đăng ký next to Đăng nhập | Guest header |
| FB-07 | Tin tức in public navigation | Guest/Student/Admin Public Site |
| FB-08 | Replace unrelated images with local generated course visuals | Home/catalog image audit |
| FB-09 | Clear Marketing-learning hero value proposition | Home hero |
| FB-10 | Use a coherent generated visual family | Image manifest |
| FB-11 | Replace five fake controls with statistics strip | Home statistics |
| FB-12 | Prominent Xem tất cả CTA | Categories/news sections |
| FB-13 | Remove misleading learning-path language | Home/catalog copy audit |
| FB-14 | Render every published category | Home + Mega Menu |
| FB-15 | Brand-led, less generic visual treatment | Full-page comparison |
| FB-16 | Add labelled illustrative testimonial section | Home testimonials |
| FB-17 | Up to eight real popular courses; balanced grid | Home `4 × 2` grid |
| FB-18 | Full prototype-style footer | Home/catalog/news footer |
| FB-19 | Price filtering and descending-price sort | Catalog filters |
| FB-20 | Search label/button stays on one line | Catalog at both viewports |
| FB-21 | Generated image-led catalog hero | Catalog hero |
| FB-22 | Learning/Marketing-oriented auth slogan | Login page |
| FB-23 | Remove Tài khoản học tập label | Login page |
| FB-24 | Separate Admin Portal with Public Site exit | Admin shell |
| FB-25 | Admin has no Student learning/cart controls | Role matrix |
| FB-26 | Remove oversized generic Admin headings | Admin shell/dashboard |
| FB-27 | Remove Laravel API/developer copy | Admin copy audit |
| FB-28 | Real-data KPI, chart, and ranked view | Admin Dashboard |
| FB-29 | White/high-contrast filter fields | Admin Student/Course filters |
| FB-30 | Balanced Apply button padding/alignment | Admin filters |
| FB-31 | Readable, aligned Student table | Admin Students |
| FB-32 | Status affordance matches actual behavior | Admin Students hover/action |
| FB-33 | Seven required Student columns | Admin Students |
| FB-34 | Same filter fixes in Course management | Admin Courses |
| FB-35 | Course list first; editor closed initially | Admin Courses initial state |
| FB-36 | Deliberate reachable table layout without clipping | Admin Courses at both viewports |
| FB-37 | Nine-column header/body parity and aligned actions | Admin Courses |
| FB-38 | Prototype-led Admin course mental model | Admin Courses full flow |
| FB-39 | Admin News CRUD/status management | Admin News + Public News |
| FB-40 | My Courses only inside Student avatar menu | Student header |
| FB-41 | Summary label above number | My Courses summary |
| FB-42 | Distinct white summary surfaces | My Courses summary |
| FB-43 | Filter order All, Active, Completed | My Courses filters |
| FB-44 | Idempotent completed demo + valid certificate | Student demo flow |
| FB-45 | Contained prominent Explore More CTA | My Courses empty/section CTA |

## 15. Definition of done

Implementation is accepted only when:

1. Every `FB-01…FB-45` row has automated or manual evidence.
2. Manual comparison passes at `1280×800` and `1440×900` with browser zoom `100%`.
3. Mega Menu behavior is verified by interaction, not inferred from a still screenshot.
4. Guest, Student, and Admin role flows pass with real backend responses.
5. All required screenshot fields in the manual checklist are populated and each screenshot has been visually inspected.
6. Backend and frontend focused/full tests and production build pass.
7. No mobile navigation/layout remains; sub-`1280px` behavior is the approved unsupported-screen notice.
8. No random external image, hotlink, fake live KPI, or unlabelled fictional testimonial remains.

