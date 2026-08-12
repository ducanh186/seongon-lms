# SEONGON Learning — Manual Prototype Comparison Checklist v2

**Specification:** `SPEC/course_platform_feedback_v2_spec.md`  
**Prototype:** `SPEC/seongon_learning_prototype_v3.html`  
**Feedback:** `SPEC/feedback_cleaned.md`

## 1. Acceptance rules

- Test the real Laravel-backed application, not mocked component previews.
- Test at browser zoom `100%` and exactly `1280×800` plus `1440×900` unless an item specifies another viewport.
- Compare prototype and product at the same viewport and equivalent role/page state.
- A screenshot is not evidence until it has been opened and visually inspected at full size.
- Do not mark `Pass` when the screenshot is loading, cropped, covered by DevTools, missing content below the fold, or showing an error banner.
- Animation/hover items require interaction evidence; a still screenshot alone cannot prove timing or pointer retention.
- Record `Fail` for any console error, uncaught exception, relevant failed request, broken image, clipped text, or header/body mismatch.
- Store evidence outside the repository under `D:\CODE\seongon-lms-feedback-v2-evidence\<YYYY-MM-DD>\`.

Result notation:

- `[ ]` Not checked.
- `[x]` Pass.
- `[!]` Fail — add a defect note and screenshot.
- `[-]` Not applicable — requires written product-owner justification.

## 2. Test preparation

- [ ] **ENV-01** — Start the current application using `Infra\start-local-web-windows.bat` or its PowerShell launcher. Confirm frontend, backend, and MySQL readiness.
- [ ] **ENV-02** — Serve `SPEC` through a local static HTTP server and open `seongon_learning_prototype_v3.html`; do not rely on a stale browser tab.
- [ ] **ENV-03** — Confirm browser zoom is `100%`, cache is refreshed, and no extension overlays the page.
- [ ] **ENV-04** — Prepare Guest, configured demo Student, and configured demo Admin sessions without printing credentials in evidence.
- [ ] **ENV-05** — Confirm demo data includes at least eight published courses, published categories/news, and one completed Student enrollment with certificate.
- [ ] **ENV-06** — Open browser Console and Network panels during each functional flow; close them before screenshots.

## 3. Required evidence manifest

Capture both prototype and product whenever an equivalent prototype page exists.

| Evidence ID | Viewport | State | Required files |
|---|---:|---|---|
| E01 | 1440×900 | Guest Home, full page | `prototype/E01-home-1440.png`, `current/E01-home-1440.png` |
| E02 | 1280×800 | Guest Home, full page | `prototype/E02-home-1280.png`, `current/E02-home-1280.png` |
| E03 | 1440×900 | Header, Mega Menu closed/open | `current/E03-header-closed.png`, `current/E03-header-mega-open.png` |
| E04 | 1440×900 | Course Catalog | `prototype/E04-catalog.png`, `current/E04-catalog.png` |
| E05 | 1440×900 | Login | `prototype/E05-login.png`, `current/E05-login.png` |
| E06 | 1440×900 | Admin Dashboard | `prototype/E06-admin-dashboard.png`, `current/E06-admin-dashboard.png` |
| E07 | 1280×800 | Admin Students | `prototype/E07-admin-students-1280.png`, `current/E07-admin-students-1280.png` |
| E08 | 1440×900 | Admin Students | `prototype/E08-admin-students-1440.png`, `current/E08-admin-students-1440.png` |
| E09 | 1280×800 | Admin Courses | `prototype/E09-admin-courses-1280.png`, `current/E09-admin-courses-1280.png` |
| E10 | 1440×900 | Admin Courses | `prototype/E10-admin-courses-1440.png`, `current/E10-admin-courses-1440.png` |
| E11 | 1440×900 | Admin News list/editor | `prototype/E11-admin-news.png`, `current/E11-admin-news.png` |
| E12 | 1440×900 | Public News | `prototype/E12-public-news.png`, `current/E12-public-news.png` |
| E13 | 1440×900 | Student header/avatar | `current/E13-student-header.png`, `current/E13-student-avatar-menu.png` |
| E14 | 1440×900 | My Courses | `prototype/E14-my-courses.png`, `current/E14-my-courses.png` |
| E15 | 1440×900 | Completed course/certificate | `current/E15-completed-course.png`, valid downloaded PDF |
| E16 | 1024×768 | Unsupported-screen notice | `current/E16-desktop-only-notice.png` |

After capture:

- [ ] **IMG-01** — Open every required PNG at original size.
- [ ] **IMG-02** — Confirm each image shows the intended route, role, viewport, and loaded data.
- [ ] **IMG-03** — Compare section order, alignment, whitespace, typography hierarchy, color, image relevance, and CTA prominence side by side.
- [ ] **IMG-04** — Record every visible difference not explicitly permitted by the SPEC; do not dismiss a difference merely because code tests pass.

## 4. Desktop-only gate

- [ ] **DESK-01** — At `1440×900`, confirm full desktop layout and no hamburger/mobile drawer. Evidence: E01/E03.
- [ ] **DESK-02** — At `1280×800`, confirm desktop layout remains aligned and usable. Evidence: E02.
- [ ] **DESK-03** — At `1279px` width, confirm the application is replaced by the approved computer-screen notice.
- [ ] **DESK-04** — At `1024×768`, confirm the notice text is exact, centered, readable, and no compressed app is visible. Evidence: E16.
- [ ] **DESK-05** — Search rendered DOM/accessibility tree for hamburger/mobile navigation; confirm it is absent at supported widths.

## 5. Public header and Mega Menu

- [ ] **HDR-01 / FB-01, FB-04** — At both acceptance widths, compare logo and header. Logo is `44–48px` high, proportional, unclipped, aligned left; navigation/actions align right.
- [ ] **HDR-02 / FB-02** — Navigate among Home, Courses, and News. Active item uses brand text plus `2px` underline and never a filled light-blue rectangle.
- [ ] **HDR-03 / FB-07** — Confirm navigation order is `Trang chủ → Khóa học → Tin tức` for Guest, Student, and Admin on Public Site.
- [ ] **HDR-04 / FB-06** — Guest sees separate **Đăng nhập** and **Đăng ký** controls on one line.
- [ ] **HDR-05 / FB-05** — Guest sees Cart. Open it and confirm a clear sign-in requirement plus sign-in CTA, without a 404 or blank page.
- [ ] **HDR-06 / FB-03** — Move pointer onto **Khóa học** without clicking. Mega Menu opens automatically.
- [ ] **HDR-07 / FB-03** — Record a short screen capture showing `fade-in + slide-down`; animation is approximately `200ms`, not abrupt or sluggish.
- [ ] **HDR-08 / FB-03** — Move pointer from trigger into panel slowly. Panel stays open without flicker or an accidental gap.
- [ ] **HDR-09 / FB-03** — Leave both areas. Panel stays briefly, then closes after approximately `200ms`.
- [ ] **HDR-10 / FB-03** — Leave and re-enter within the delay. Pending close is cancelled.
- [ ] **HDR-11 / FB-03** — Click the **Khóa học** label. It navigates to `/courses`; click is not required to open the panel.
- [ ] **HDR-12 / FB-03, FB-14** — Open Mega Menu and compare its categories with the published category API response; every category appears once plus **Tất cả khóa học**.
- [ ] **HDR-13 / FB-03** — Click a category and confirm URL/category-filter state matches that category.
- [ ] **HDR-14 / FB-03** — Keyboard-focus **Khóa học**; menu opens. Tab through links, press `Escape`, confirm closure and focus restoration.
- [ ] **HDR-15 / FB-03** — Simulate category API error. Menu shows **Không thể tải danh mục** but **Tất cả khóa học** still works.
- [ ] **HDR-16 / FB-03** — Simulate empty categories. Menu shows **Chưa có danh mục khóa học** and retains **Tất cả khóa học**.
- [ ] **HDR-17** — Inspect trigger semantics: `aria-haspopup`, `aria-expanded`, `aria-controls`, stable panel `id`, visible keyboard focus.

## 6. Home page

- [ ] **HOME-01 / FB-09** — Hero headline describes a practical Marketing-learning platform; no internal course code is the main proposition.
- [ ] **HOME-02 / FB-10** — Hero uses a locally stored `imagegen` asset relevant to Marketing learning, with no garbled text or copied logo.
- [ ] **HOME-03** — Hero CTAs are **Khám phá khóa học** and **Đăng ký học thử/Đăng ký** and both routes work.
- [ ] **HOME-04 / FB-11** — The old five icon controls are absent. Statistics strip shows exactly `14+ năm`, `2.500+`, `6`, and `100%` with approved labels.
- [ ] **HOME-05 / FB-13** — Category copy does not promise a “lộ trình” for independent courses.
- [ ] **HOME-06 / FB-14** — Every published API category is visible with a matching published-course count.
- [ ] **HOME-07 / FB-12** — **Xem tất cả** is visually prominent, keyboard focusable, and routes to the complete catalog.
- [ ] **HOME-08 / FB-17** — With eight or more published courses, popular section renders eight real records in a balanced `4 × 2` grid at `1440px`.
- [ ] **HOME-09 / FB-17** — With fewer than eight records, layout rebalances without a fake course or a card-shaped empty hole.
- [ ] **HOME-10 / FB-08, FB-10** — Inspect every visible course image. Each matches its subject; no random landscape, city, or unrelated stock photo remains.
- [ ] **HOME-11 / FB-15** — Compare E01/E02 with prototype: brand hierarchy, deliberate section rhythm, and varied authentic-looking visual composition replace generic AI-like blocks.
- [ ] **HOME-12 / FB-16** — Testimonial section exists. Each fictional testimonial visibly says **Nội dung minh họa**.
- [ ] **HOME-13 / FB-16** — Generated portrait/illustration does not imitate a known person; quote/name are crisp HTML text and contain no fake company badge/result metric.
- [ ] **HOME-14** — Latest News displays published API content and **Xem tất cả bài viết** works.
- [ ] **HOME-15 / FB-18** — Footer has prototype-style four-column information hierarchy, meaningful links, and materially more content than the old short footer.
- [ ] **HOME-16** — Scroll full page at both widths. No accidental blank band, cropped section, horizontal overflow, or broken image is visible.

## 7. Course catalog

- [ ] **CAT-01 / FB-21** — Catalog top uses a large relevant generated banner rather than a text-only “Tìm đúng lộ trình…” block. Evidence: E04.
- [ ] **CAT-02 / FB-13** — Title/copy says **Khám phá khóa học** or approved equivalent and does not misrepresent independent courses as a path.
- [ ] **CAT-03 / FB-20** — Search field/button label remains on one line at `1280px` and `1440px`.
- [ ] **CAT-04 / FB-19** — Controls include search, category, level, price type, and sort options.
- [ ] **CAT-05 / FB-19** — Select **Giá giảm dần**. Confirm API request/URL contract and visible prices are descending.
- [ ] **CAT-06** — Apply a category from Mega Menu, then search/sort. Confirm query state and page reset behavior are correct.
- [ ] **CAT-07** — Verify loading skeleton/progress, network error with retry, empty result, and pagination states.
- [ ] **CAT-08 / FB-08** — Inspect all card images at actual rendered size for relevance, crop, consistent `16:9`, and no layout shift.

## 8. Login

- [ ] **AUTH-01 / FB-22** — Compare E05. Desktop uses two-column visual/form hierarchy and a Marketing-learning success message.
- [ ] **AUTH-02 / FB-23** — **Tài khoản học tập** is absent before **Chào mừng bạn!**.
- [ ] **AUTH-03** — Invalid credentials and validation errors appear in Vietnamese without raw API/framework text.
- [ ] **AUTH-04** — Guest entering from Cart signs in and returns to the intended route; Student goes to Student flow, Admin to Admin Portal.

## 9. Admin shell and Dashboard

- [ ] **ADM-01 / FB-24** — Admin Portal uses separate sidebar/topbar and does not render Student public header. Evidence: E06.
- [ ] **ADM-02 / FB-24** — **Xem site public** returns to Public Site while retaining Admin identity.
- [ ] **ADM-03 / FB-25** — Admin has no My Courses, Notification, Cart, checkout, or learner CTA anywhere.
- [ ] **ADM-04 / FB-26** — Oversized **Admin Console** and **Quản trị SEONGON LMS** presentation is absent.
- [ ] **ADM-05 / FB-27** — Search visible UI for `Laravel`, `API`, and developer diagnostics; none appear in user-facing copy.
- [ ] **ADM-06 / FB-28** — Dashboard includes meaningful KPI cards, a real-data chart, and a ranked/table view.
- [ ] **ADM-07 / FB-28** — Compare every displayed metric with its aggregate API response; no hard-coded prototype trend or fake live number appears.
- [ ] **ADM-08** — Empty aggregate data produces readable empty states and no divide-by-zero/NaN chart.

## 10. Admin Student management

- [ ] **STU-01 / FB-29** — Search/status fields have white, high-contrast backgrounds at both acceptance widths.
- [ ] **STU-02 / FB-30** — **Áp dụng** has balanced padding and equal visual height/alignment with adjacent fields.
- [ ] **STU-03 / FB-33** — Header labels are exactly: Học viên, Email, SĐT, Khóa đã đăng ký, Ngày tạo, Trạng thái, Thao tác.
- [ ] **STU-04 / FB-31, FB-33** — Inspect at least five rows: each has exactly seven aligned cells under the correct header.
- [ ] **STU-05 / FB-32** — Hover status badge/row. Visual treatment does not falsely imply the status badge itself is clickable.
- [ ] **STU-06 / FB-32** — Lock/unlock action is explicitly labelled, confirms where required, updates API state, and refreshes row status.
- [ ] **STU-07** — Search a known Student and apply status filter. Result count and enrollment count match API data.
- [ ] **STU-08** — At E07/E08, no header or row is clipped. Any deliberate scroll container retains reachable aligned cells.

## 11. Admin Course management

- [ ] **CRS-01 / FB-35** — Initial page is list-first; create/edit form is closed. **Tạo khóa học** is the explicit opener.
- [ ] **CRS-02 / FB-34** — Search/status fields and **Áp dụng** use the same corrected styling as Student management.
- [ ] **CRS-03 / FB-37** — Header labels are exactly: Khóa học, Danh mục, Cấp độ, Học phí, Bài học, Câu hỏi, Đăng ký, Trạng thái, Thao tác.
- [ ] **CRS-04 / FB-36, FB-37** — Inspect at least five rows: each has exactly nine cells aligned with nine headers.
- [ ] **CRS-05 / FB-37** — **Thao tác** header and row actions share the same horizontal alignment.
- [ ] **CRS-06 / FB-36** — At E09/E10, no accidental clipping/overlap exists; deliberate scrolling, if present, reaches every column.
- [ ] **CRS-07 / FB-38** — Create, edit, publish/hide, lesson/quiz management, and delete protection follow prototype mental model and API rules.
- [ ] **CRS-08** — Aggregate lesson/question/enrollment counts match API responses without row-by-row request bursts.

## 12. Admin/Public News

- [ ] **NEWS-01 / FB-39** — Admin sidebar includes **Quản lý blog tin tức**. Evidence: E11.
- [ ] **NEWS-02 / FB-39** — Create a uniquely titled draft and confirm it appears as **Bản nháp**.
- [ ] **NEWS-03 / FB-39** — Publish it, edit title/excerpt, and confirm edited content appears on Public News. Evidence: E12.
- [ ] **NEWS-04 / FB-39** — Move it back to draft/hidden and confirm it disappears from Public News without stale pagination.
- [ ] **NEWS-05 / FB-39** — Confirm delete; record disappears from Admin list and remains absent publicly.
- [ ] **NEWS-06** — Force a failed mutation. Editor stays open and preserves entered content; no false success notice appears.
- [ ] **NEWS-07** — Verify public category filtering, pagination, page reset, empty state, and error/retry behavior.

## 13. Student header and My Courses

- [ ] **MY-01 / FB-40** — Student primary navigation contains no standalone **Khóa học của tôi**.
- [ ] **MY-02 / FB-40** — Open avatar menu; it contains **Hồ sơ**, **Khóa học của tôi**, and **Đăng xuất**. Evidence: E13.
- [ ] **MY-03 / FB-05** — Student header shows Cart badge and Notification; Admin/Guest role visibility still follows the header matrix.
- [ ] **MY-04 / FB-41** — In each summary card, label appears above number: Tổng khóa học, Đang học, Đã hoàn thành.
- [ ] **MY-05 / FB-42** — Summary cards have distinct white surfaces with clean section boundaries and no background bleed.
- [ ] **MY-06 / FB-43** — Filter order is exactly **Tất cả → Đang học → Đã hoàn thành**.
- [ ] **MY-07** — Compare summary totals with server global summary when enrollment records span more than one page.
- [ ] **MY-08 / FB-45** — **Khám phá thêm** is a prominent contained CTA and routes to the catalog.
- [ ] **MY-09** — Verify loading, error, empty, active, completed, and expired card states.

## 14. Completed demo and certificate

- [ ] **CERT-01 / FB-44** — Demo Student has at least one course at `100%`, passed assessment, and certificate record. Evidence: E15.
- [ ] **CERT-02 / FB-44** — Completed card shows **Tải chứng chỉ** and no contradictory active-learning status.
- [ ] **CERT-03 / FB-44** — Download through UI. File response is HTTP `200`, `application/pdf`, non-empty, begins with `%PDF`, and opens successfully.
- [ ] **CERT-04** — Run the demo seeder again. It does not duplicate enrollment, attempt, progress, or certificate.
- [ ] **CERT-05** — Expired/ineligible course does not expose forbidden learning or certificate CTA.

## 15. Generated-image review

- [ ] **GEN-01 / FB-08, FB-10** — Asset manifest lists prompt, filename, target page/course, dimensions, and generation date for every new image.
- [ ] **GEN-02** — No generated image contains garbled text, fake logo, fake certificate, fake award, watermark, or real-person likeness.
- [ ] **GEN-03** — SEO, Google Ads, Content SEO, AI Search, and Analytics families are visually distinguishable but share one palette/style system.
- [ ] **GEN-04** — All assets are local, optimized, load successfully in production build, and have correct content-bearing/decorative semantics.
- [ ] **GEN-05 / FB-16** — Every fictional testimonial is visibly labelled **Nội dung minh họa** in the rendered page and screenshot.

## 16. Final visual audit

For every E01–E16 image, explicitly answer:

- [ ] Correct page and role?
- [ ] Correct viewport and `100%` zoom?
- [ ] Real content fully loaded?
- [ ] Header/footer and important controls visible where required?
- [ ] No crop, overlay, error banner, broken image, or blank section?
- [ ] Prototype hierarchy and interaction intent preserved?
- [ ] Typography, padding, columns, cards, and CTA alignment inspected—not merely assumed?
- [ ] Difference is either fixed or linked to a written SPEC exception?

## 17. Automated/runtime gate

- [ ] **FINAL-01** — Focused frontend tests for every changed surface pass.
- [ ] **FINAL-02** — Full deterministic frontend test set passes.
- [ ] **FINAL-03** — Frontend production build passes.
- [ ] **FINAL-04** — Focused and full Laravel test suites pass.
- [ ] **FINAL-05** — Relevant PHP lint and `git diff --check` pass.
- [ ] **FINAL-06** — Browser Console contains no uncaught error in required flows.
- [ ] **FINAL-07** — Relevant Network requests contain no unexpected `4xx/5xx` response.
- [ ] **FINAL-08** — All `FB-01…FB-45` entries are covered by at least one checked item above.
- [ ] **FINAL-09** — Product owner manually reviews the complete evidence folder and signs off the result.

## 18. Sign-off record

| Field | Value |
|---|---|
| Build/commit tested | Record the exact Git commit hash used for the run |
| Test date | Record the local date and time |
| Tester | Record the tester name |
| Prototype file hash | Record the SHA-256 of `seongon_learning_prototype_v3.html` |
| Feedback file hash | Record the SHA-256 of `feedback_cleaned.md` |
| Result | `PASS` only when every required item passes; otherwise `FAIL` |
| Open defects | Link the defect list or write `None` |
| Product-owner sign-off | Name and date after reviewing the actual evidence images |

