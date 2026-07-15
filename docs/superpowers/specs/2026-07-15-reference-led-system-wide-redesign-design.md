# Reference-Led System-Wide Redesign

## Context and Goal

The current interface is a spacious teal landing page, while `onthisinhvien.com` uses a dense content-first layout with a large photographic banner, compact navigation, an immediate metrics strip, and repeated catalog sections. The redesign will adopt that layout rhythm and information density across Guest, Student, and Admin surfaces while preserving SEONGON branding, real application data, existing routes, and existing backend contracts.

This is selective visual translation, not a pixel copy. The reference supplies layout, hierarchy, and interaction patterns. SEONGON supplies the logo, teal functional accent, product content, and business flow.

## Design Direction

- `DESIGN_VARIANCE: 5`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 6`
- Light theme with pale blue-gray surfaces and dark navy text.
- `Be Vietnam Pro` remains self-hosted for reliable Vietnamese rendering.
- Teal is the single functional accent for buttons, links, focus, and active states. Magenta is limited to brand artwork.
- Corners use an 8 to 12px system. Borders provide most separation; shadows remain subtle.
- Content width is 1200 to 1280px. Typical section spacing is 48 to 64px.

## Global Shell

Desktop uses a roughly 72px sticky header with the SEONGON logo and brand message on the left, primary navigation in the center, and search plus account actions on the right. Mobile uses a compact header, prominent search access, and a drawer menu. Guest, Student, and Admin share typography, buttons, inputs, status treatments, async states, and focus behavior.

## Guest Surfaces

Home opens with a large photographic banner built around real SEO AI Max, Google Ads, and Content SEO offerings. It is followed immediately by a five-column information strip. Numeric claims may appear only when supplied by the API; unavailable metrics become factual product capabilities such as curriculum, quizzes, and certificates.

Category navigation replaces the reference site's school directory pattern. Popular and category-based course sections use denser four-column desktop grids, two or three columns on tablet, and one column on mobile. Cards prioritize thumbnail, category, title, rating, lesson count, and price instead of long descriptions.

Catalog places search and filtering first. Desktop uses a filter sidebar; mobile uses a filter drawer. Course Detail uses curriculum content on the left and a sticky enrollment summary on the right. Login, registration, and checkout use the same visual shell without changing authentication or mock-payment contracts.

## Student Surfaces

My Courses uses compact progress summaries, status filters, and course cards with progress, next lesson, and a clear continue action. The learning workspace uses curriculum navigation, primary lesson content, and contextual progress or resources. Tablet removes secondary density; mobile becomes a strict single column with curriculum in a drawer.

Quiz states clearly distinguish selected, correct, incorrect, disabled, and completed answers. Certificate and Profile surfaces use the same hierarchy and tokens while preserving current actions and business rules.

## Admin Surfaces

Admin uses the shared visual language inside a purpose-built management shell. Desktop has a fixed sidebar for Dashboard, Users, Categories, Courses, and Reviews, plus a compact top bar. Tables remain tables, with concise rows, filters, pagination, status chips, and action menus. Forms group related fields with labels above inputs. Destructive actions require a confirmation dialog naming the affected record.

Tablet permits controlled horizontal table handling. Mobile converts essential records into compact cards where necessary and must not introduce page-level horizontal overflow.

## Components and Data Flow

The implementation extends the existing MUI theme rather than adding another design system. Shared presentation units include `GlobalHeader`, `HeroBanner`, `MetricsStrip`, `SectionHeading`, `CourseCard`, course grids or rails, `StudentWorkspaceShell`, `AdminDataTable`, async states, and confirmation dialogs.

Data continues to flow from page components through the existing API client and Laravel endpoints into typed models and presentation components. Existing query parameters, AuthContext, routes, payloads, database schema, and payment mock contract remain unchanged. No invented testimonials, statistics, reviews, or marketing claims are allowed.

## Accessibility and Responsive Behavior

All interactive controls need keyboard access, visible focus, WCAG AA contrast, disabled states, and readable Vietnamese labels. Loading skeletons match final layout geometry. Error states provide retry without clearing relevant filters. Empty states explain the next action. Motion uses only opacity and transform for feedback or state transitions and respects `prefers-reduced-motion`.

## Verification

- Add or update focused Vitest and React Testing Library coverage for API-backed Home content, responsive navigation, role-based links, filters, async states, and accessibility behavior.
- Run the full frontend suite twice and run the production build.
- Run `php artisan test --testdox` without changing backend contracts.
- Rebuild the existing Docker Compose stack and confirm `mysql`, `app`, and `nginx` are healthy.
- Smoke test Guest, Student, and Admin flows at desktop and mobile sizes.
- Check keyboard navigation, contrast, no horizontal overflow, loading, error, empty, disabled, and success states.
- Keep the production JavaScript bundle increase below 5 percent.

## Non-Goals

Do not add blog, cart, recruiter, jobs, internships, combos, new backend endpoints, new database fields, fabricated public metrics, or prototype-only flows. Do not modify unrelated runtime files under `data/*`.
