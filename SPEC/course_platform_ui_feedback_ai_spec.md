# Course Platform UI/UX Feedback — AI Implementation Specification

## Purpose

This file is intended for an AI coding agent or developer.

The goal is **not to redesign the product freely**. The goal is to implement the feedback below as faithfully as possible.

Important rules:

- Do not remove or simplify any requirement in this document.
- Do not invent new product behavior unless it is required to make the requested behavior work.
- Keep Admin and Student behavior clearly separated.
- Follow the existing prototype as the primary UI/UX reference wherever the current implementation conflicts with it.
- If the current codebase already contains a related implementation, modify it instead of creating a duplicate feature.
- Preserve existing working features unless they conflict with the requirements below.
- Verify desktop layout carefully, especially table alignment, header spacing, white backgrounds, and horizontal overflow.
- When a requirement mentions that it was already previously feedbacked, still verify that it is implemented correctly.

---

# 1. Student Information

## Issue

The current system does not expose enough information about students.

## Required Action

- Review the student information area.
- Improve the amount and/or organization of student information available to administrators.
- The administrator should be able to understand more about a student than in the current implementation.
- Do not remove existing student information.

---

# 2. Course Management

## 2.1 Search Box and "Apply" Button

This area has already been mentioned in previous feedback.

## Required Action

- Verify the Search box.
- Verify the "Apply" button/text.
- Ensure the previously requested behavior and UI changes have been implemented.
- Do not ignore this area just because it was mentioned before.

---

## 2.2 Course List Table UI

### Product Usage Context

The Course List page is mainly used to **view the list of courses**.

Creating a new course is relatively infrequent.

Therefore, the UI should prioritize course-list readability and usability rather than visually prioritizing course creation.

### Current Problems

- The course list table looks visually broken.
- Some columns appear clipped or partially hidden.
- The user has to horizontally scroll left/right to see the content.
- The table header and data rows do not appear to contain the same number of columns.
- The visible header appears to show only:
  - Status
  - Tuition / Course Fee
  - Actions
- The row content below appears to contain approximately six columns.
- The "Actions" header is visually shifted/misaligned relative to the corresponding row content.

### Required Action

- Fix the table layout so all intended columns are represented correctly.
- Ensure each header column aligns with the corresponding data column.
- Ensure the number of header columns matches the number of row columns.
- Fix the "Actions" header alignment.
- Prevent accidental clipping of columns.
- Reduce or eliminate unnecessary horizontal scrolling.
- Make the table visually clean and readable on the expected desktop viewport.
- If horizontal scrolling is truly necessary because of the data width, it must be intentional, visually stable, and not cause header/data misalignment.

---

## 2.3 Match the Course UI to the Prototype

### User Expectation

When a user enters:

`Courses -> Course Categories / Course List`

the mental model and visual experience should follow the existing prototype more closely than the current UI.

### Required Action

- Adjust the course-management interface to be more consistent with the prototype.
- Use the prototype as the primary visual/interaction reference.
- Improve friendliness and visual coherence.
- Do not create a substantially different information architecture unless technically required.

---

# 3. Blog / News Management

## Current Problem

The platform has a News section, but there is no visible Blog/News management area in the admin interface.

## Required Action

- Add or restore a Blog/News management section in the Admin area.
- It should support management of the News content shown on the learning website.
- Reuse existing content-management infrastructure if available.

---

# 4. Public / Main Website Header

## 4.1 Missing News Navigation Item

### Current Problem

The website has News content, but the Header does not contain a News item.

## Required Action

- Add a `News` navigation item to the Header.
- It should route users to the appropriate News page/section.

---

# 5. Header Behavior for Admin Accounts

## 5.1 Review the "Saigon Admin" Header Menu

### Current Problem

When logged in as Admin, the Header currently shows items such as:

- Course / Courses
- My Courses
- Admin / Management

This feels logically inconsistent.

### Required Action

- Review the authenticated Admin header/navigation.
- Ensure Admin-only navigation is appropriate for an administrator account.
- Remove student-specific navigation from the Admin experience unless explicitly required elsewhere.

---

## 5.2 Remove "My Courses" from Admin

### Product Logic

An administrator does not automatically have learner courses.

If a company administrator also wants to study courses, they should register/use a separate normal Student account.

### Required Action

- Do not show `My Courses` for Admin accounts.
- Keep Admin and Student roles logically separated.
- Do not treat an Admin account as a Student account.

---

# 6. Header Behavior for Student Accounts

## 6.1 Missing Notice / Notification

### Current Problem

When logged in as a Student, the interface does not show a Notice/Notification control.

This has already been feedbacked previously.

## Required Action

- Add or restore the Student Notice/Notification control.
- Verify that the intended existing notification behavior still works.

---

## 6.2 Missing Cart Button

### Current Problem

When logged in as a Student, the Header does not show the Cart button.

This has already been feedbacked previously.

## Required Action

- Add or restore the Cart button for Student accounts.
- Keep its behavior consistent with the existing purchasing/enrollment flow.

---

# 7. Remove "My Courses" Button from Student Header

## Desired Interaction

The Header should not contain a dedicated `My Courses` button.

Instead, when the Student clicks the avatar / demo learner avatar, a dropdown box should open.

The dropdown should contain at least:

- Profile
- My Courses

## Required Action

- Remove the standalone `My Courses` button from the Student Header.
- Add or verify an Avatar dropdown.
- Place `Profile` in the Avatar dropdown.
- Place `My Courses` in the Avatar dropdown.
- Avoid duplicating `My Courses` in both the Header and Avatar dropdown.

---

# 8. "My Courses" Page — Summary Dashboard

## 8.1 Fix Label and Number Order

### Current Problem

The small dashboard/statistics area contains three large values for items such as:

- Total Courses
- In Progress
- Completed

The label/value order appears reversed or incorrectly arranged.

### Expected Layout

For example:

`Total Courses`
`3`

The text label should be above.
The large numeric value should be below.

### Required Action

- Place each statistic label above its corresponding number.
- Place the number below the label.
- Apply this consistently to Total Courses, In Progress, and Completed.

---

## 8.2 Fix White Dashboard Background

### Current Problem

The white background of the dashboard/statistics area is not visually separated correctly.

It appears to bleed, clip, or extend into adjacent content.

### Required Action

- Separate the white dashboard background cleanly from surrounding sections.
- Check:
  - container structure
  - background boundaries
  - padding
  - margin
  - section spacing
  - border/radius if applicable
  - overflow behavior
- The statistics area should visually read as a distinct, intentional section.

---

# 9. Course Status Filter / Tabs

## Current Order

The current order appears to be:

- In Progress
- Completed
- All

## Expected Order

The logical order should be:

1. All
2. In Progress
3. Completed

## Required Action

- Reorder the filter/tabs to:
  - All
  - In Progress
  - Completed
- Keep filtering behavior unchanged except for the order unless a bug is found.

---

# 10. Add a Completed Demo Course

## Purpose

A completed course is needed to demonstrate the end-to-end flow, especially the certificate download flow.

## Required Action

- Add at least one demo course with status `Completed`.
- Ensure it is visible under the `Completed` filter/tab.
- The course should be usable for demo purposes.
- The demo should support the post-completion flow, including certificate-related behavior where implemented.

## Demo Flow to Support

Example:

`Student -> My Courses -> Completed -> Completed Demo Course -> Certificate -> Download Certificate`

Do not remove other existing demo courses.

---

# 11. "Explore More" Call-to-Action Button

## Current Problem

The `Explore More` call-to-action button visually blends into the background and is not prominent enough.

## Required Action

- Make the `Explore More` button visually more prominent.
- Use a background/button treatment consistent with the other primary buttons.
- Avoid a low-contrast appearance where the button blends into the surrounding background.
- Keep visual styling consistent with the existing design system/prototype.

---

# 12. Role Logic Summary

## Admin

Admin should:

- Access administration/management features.
- Manage courses.
- Manage Blog/News content.
- Access student information.
- Not see `My Courses` as an Admin learner feature.

If an administrator wants to take a course, they should use/register a Student account.

## Student

Student should:

- See Notice/Notification.
- See Cart.
- Access Profile from Avatar dropdown.
- Access My Courses from Avatar dropdown.
- Not need a separate `My Courses` button in the Header.
- View course statistics.
- Filter courses by All / In Progress / Completed.
- Be able to see at least one completed demo course for demonstration/testing.

---

# 13. Implementation Checklist

## Student Information

- [ ] Review student information page/section.
- [ ] Expose more useful student information to Admin.
- [ ] Preserve existing student information.

## Course Management

- [ ] Verify Search box previous feedback.
- [ ] Verify "Apply" button/text previous feedback.
- [ ] Fix Course List table clipping.
- [ ] Fix missing/hidden columns.
- [ ] Match header column count to data column count.
- [ ] Align every header with its corresponding data column.
- [ ] Fix `Actions` header alignment.
- [ ] Reduce unnecessary horizontal scrolling.
- [ ] Improve Course List readability.
- [ ] Match Course Management UI more closely to the prototype.

## Blog / News

- [ ] Add or restore Blog/News management in Admin.
- [ ] Connect it to the website News content if infrastructure exists.

## Main Header

- [ ] Add `News` navigation item.

## Admin Header

- [ ] Review `Saigon Admin` menu/navigation.
- [ ] Remove `My Courses` from Admin.
- [ ] Keep Admin and Student navigation separate.

## Student Header

- [ ] Add/restore Notice/Notification.
- [ ] Add/restore Cart.
- [ ] Remove standalone `My Courses` button.
- [ ] Add/verify Avatar dropdown.
- [ ] Add `Profile` to Avatar dropdown.
- [ ] Add `My Courses` to Avatar dropdown.

## My Courses Dashboard

- [ ] Put statistic labels above numbers.
- [ ] Put numbers below statistic labels.
- [ ] Verify Total Courses layout.
- [ ] Verify In Progress layout.
- [ ] Verify Completed layout.
- [ ] Fix white background bleed/clipping.
- [ ] Ensure the dashboard is visually separated from surrounding content.

## Course Filters

- [ ] Reorder to `All -> In Progress -> Completed`.

## Demo Data / Demo Flow

- [ ] Add one Completed demo course.
- [ ] Ensure it appears under Completed.
- [ ] Ensure the completed course can support certificate-flow demonstration.
- [ ] Verify certificate download flow if already implemented.

## CTA

- [ ] Make `Explore More` visually prominent.
- [ ] Use styling consistent with primary buttons.
- [ ] Prevent the CTA from blending into the background.

---

# 14. Acceptance Criteria

The implementation should be considered complete only when all of the following are true:

1. Course List table headers and rows are structurally aligned.
2. No important course columns are unintentionally clipped.
3. The Course List UI is visibly closer to the prototype.
4. Blog/News management exists in Admin.
5. News appears in the website Header.
6. Admin does not see `My Courses`.
7. Student sees Notice/Notification and Cart.
8. Student accesses `My Courses` from the Avatar dropdown, not a duplicate standalone Header button.
9. My Courses statistics show label above number.
10. The statistics white background is visually contained.
11. Course filter order is `All -> In Progress -> Completed`.
12. At least one Completed demo course exists.
13. The Completed demo course supports demonstration of the certificate flow where available.
14. `Explore More` is visually distinguishable as a call-to-action.
15. No requirement in this document is silently skipped.
