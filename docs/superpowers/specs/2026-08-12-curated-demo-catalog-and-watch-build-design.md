# Curated Demo Catalog and Watch Build Design

**Date:** 2026-08-12  
**Status:** Awaiting specification approval  
**Scope:** Demo course content and Windows frontend watch-build workflow

## 1. Problem

The live demo database contains Faker-generated Latin course titles such as `Qui Distinctio Optio`, `Nobis Facilis Earum`, and `Eum Qui Et`. These titles make Student, Catalog, and Admin screens look unfinished. The existing generated catalog is deterministic but still relies on numbered, repeated title templates. The completed learning fixture also exposes implementation language through `Completed Demo Course`.

The repository also lacks a one-command Windows script that rebuilds frontend production assets whenever frontend source files change.

## 2. Goals

1. Every demo course visible to users has a deliberate Vietnamese Marketing, SEO, Content, Advertising, Analytics, or AI title.
2. Seeded titles are deterministic and editorially meaningful; no Faker words, Latin placeholders, generic demo labels, or numeric title suffixes remain.
3. Course descriptions, lesson titles, categories, thumbnails, instructors, levels, and prices remain coherent with each course title.
4. Existing demo enrollments, progress, quiz attempts, and certificates continue to work after the catalog update.
5. A Windows `.bat` command continuously rebuilds Vite production assets after frontend source changes.

## 3. Non-goals

- No production CMS redesign.
- No image generation in this task; existing generated local course artwork remains in use and is mapped by track.
- No automatic database migration, destructive reset, or seed operation from the watch-build script.
- No PHP watcher is required because Laravel reads PHP source on each request in the local environment.
- Factories may remain random for isolated tests, but seeded/live demo data must not use factory-generated display names.

## 4. Curated catalog model

`GeneratedDemoCatalogSeeder` will own an explicit course blueprint list. Each blueprint contains:

- stable `slug`;
- curated `title`;
- category/track;
- concise learner-oriented description;
- four relevant lesson titles;
- level and price;
- instructor assignment;
- local generated thumbnail selection.

The catalog will include distinct titles across these tracks:

### SEO and AI

- SEO Foundation: Xây nền tảng tăng trưởng bền vững
- Nghiên cứu từ khóa theo Search Intent
- Technical SEO Audit thực chiến
- SEO Onpage cho website doanh nghiệp
- Xây dựng Topic Cluster và Topical Authority
- Ứng dụng AI trong quy trình SEO
- Phân tích đối thủ và Content Gap
- Đo lường SEO với Google Search Console

### Google Ads

- Google Ads Search từ cơ bản đến tối ưu
- Lập kế hoạch từ khóa cho quảng cáo tìm kiếm
- Viết mẫu quảng cáo tăng tỷ lệ chuyển đổi
- Performance Max cho doanh nghiệp
- Tối ưu Landing Page cho Google Ads
- Đo lường chuyển đổi với GA4 và GTM
- Quản trị ngân sách và chiến lược đấu thầu
- Phân tích báo cáo và tối ưu ROAS

### Content Marketing

- Content Marketing Foundation
- Xây dựng chân dung khách hàng mục tiêu
- Lập Content Plan theo hành trình khách hàng
- Viết Content chuẩn SEO và dễ đọc
- Copywriting cho Landing Page
- Storytelling cho thương hiệu
- Content Audit và tối ưu nội dung cũ
- Xây dựng hệ thống Content đa kênh

The production seed target remains large enough for pagination and Admin-table verification. Additional titles must be explicitly authored in the same blueprint file; they must not be formed by adding sequence numbers to a repeated topic.

## 5. Completed learning fixture

The completed fixture will use a real learner-facing course identity:

- category: `SEO thực chiến`;
- title: `SEO Foundation: Xây nền tảng tăng trưởng bền vững`;
- lessons: `Xác định mục tiêu SEO và KPI` and `Xây dựng kế hoạch SEO 90 ngày`;
- quiz: `Đánh giá cuối khóa SEO Foundation`;
- instructor: a named SEONGON instructor already used by the catalog.

The stable fixture slug may remain unchanged internally to preserve idempotency and existing relations. User-facing strings must not expose `Demo` or English placeholder copy.

## 6. Existing-data reconciliation

The implementation must not rely on a clean database.

1. The curated catalog seeder recreates its managed catalog inside the existing transaction, as it does today.
2. The completed fixture uses stable lookup keys and updates its user-facing fields in place.
3. Seed order restores the completed fixture after the main catalog seed.
4. Existing Student enrollments produced by the supported seed flow resolve to curated course records after reseeding.
5. No routine command may use `migrate:fresh`.

The delivered verification instructions will use the focused idempotent seed commands required to reconcile the current local demo database.

## 7. Windows watch-build script

Create `Infra/watch-build-web-windows.bat` with these behaviors:

1. Resolve paths relative to the script, so it works from any current directory.
2. Verify `node` and `npm` are available and fail with a clear message otherwise.
3. Enter `FE/DEMO`.
4. If `node_modules` is missing, run `npm install --no-audit --no-fund`.
5. Run `npm run build -- --watch` and keep the terminal attached so rebuild logs remain visible.
6. Return the child command exit code.
7. Do not run Composer, Laravel migrations, seeders, or web servers.

This script complements, rather than replaces, `Infra/start-local-web-windows.bat`: one starts the development servers; the other continuously refreshes production `dist` assets.

## 8. Testing and acceptance

### Backend RED/GREEN coverage

- Seeder test rejects Latin/Faker-style placeholder titles and numeric template suffixes.
- Seeder test asserts a representative curated title set and unique titles.
- Completed-course test asserts learner-facing category, course, lesson, quiz, and instructor strings contain no `Demo` placeholder.
- Seeder remains idempotent and preserves valid progress/certificate behavior.

### Script coverage

- A PowerShell/Pester or static contract test runs the `.bat` in a controlled mode or inspects its resolved command contract without entering an infinite watch loop.
- The script must prove relative-path resolution, dependency guard, exact Vite watch command, and exit-code propagation.

### Runtime verification

1. Run focused backend tests and then the complete backend test suite.
2. Seed the supported local demo data without `migrate:fresh`.
3. Run the frontend tests and production build.
4. Launch the live stack and visually verify Home, Catalog, My Courses, and Admin Courses contain only curated titles.
5. Start the `.bat`, change a harmless frontend source file timestamp/content in a controlled reversible test, and observe a second successful Vite build.

## 9. Definition of done

- No visible seeded course title contains Faker Latin words, `Completed Demo Course`, or a generated sequence suffix.
- Catalog, Student My Courses, and Admin Courses show coherent curated course identities.
- Completed progress and certificate download still work.
- `Infra/watch-build-web-windows.bat` continuously rebuilds after frontend changes and emits readable failures.
- Focused/full automated tests, production build, seed idempotency, live visual checks, and `git diff --check` pass.
