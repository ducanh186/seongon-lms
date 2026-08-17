# SEONGON LMS — Full Manual Acceptance Test

## 1. Start the verified local stack

From `D:\CODE\seongon-lms`:

```powershell
.\Infra\build-local-web-windows.bat
.\Infra\start-local-web-windows.bat
```

Open:

- Web: `http://localhost:5173`
- API health: `http://127.0.0.1:8000/up`
- phpMyAdmin: `http://127.0.0.1:8081`
- Database: `seongon_lms`

Use the MySQL username and password from `BE\.env`. Demo application accounts use password `password`:

- Admin: `admin@seongon.vn`
- Student: `student@seongon.vn`

## 2. Admin ERD coverage

1. Log in as Admin and confirm the left sidebar shows these 15 core entries: **Vai trò, Học viên, Giỏ hàng, Mục giỏ hàng, Đơn hàng, Danh mục, Gán danh mục, Khóa học, Bài học, Ghi danh, Tiến độ học tập, Bài kiểm tra, Câu hỏi, Đáp án, Kết quả bài kiểm tra**.
2. Click every entry. Each screen must show a real table, an explicit empty state, or a retryable API error; no core entry may show an ERD placeholder.
3. Confirm transactional/history screens are read-only: Carts, Cart items, Orders, Enrollments, Learning progress, and Attempts.
4. From Questions or Answers, click **Mở bài kiểm tra** and confirm the existing nested Course editor opens.
5. Confirm auxiliary features remain available separately: Certificates, Reviews, and News.
6. Use `SPEC/ADMIN_ERD_ACCEPTANCE_CHECKLIST.md` to record the teacher-facing result for each entity.

## 3. Course workflow: Admin → Database → Public Catalog

1. Log in as Admin and open Course Management.
2. Create a draft named `MANUAL FULL COURSE <timestamp>`.
3. Select two Categories and save.
4. Add one Lesson.
5. Create one Exam, one Question, and at least two Answers; mark exactly one Answer correct.
6. Publish the Course.
7. In phpMyAdmin, replace the title below and run:

```sql
SET @course_id := (
  SELECT id
  FROM courses
  WHERE title = 'MANUAL FULL COURSE <timestamp>'
  ORDER BY id DESC
  LIMIT 1
);

SELECT id, title, category_id, status, updated_at
FROM courses
WHERE id = @course_id;

SELECT cc.course_id, c.id AS category_id, c.name
FROM course_categories cc
JOIN categories c ON c.id = cc.category_id
WHERE cc.course_id = @course_id
ORDER BY c.id;

SELECT id, course_id, title, position, sort_order
FROM lessons
WHERE course_id = @course_id;

SELECT e.id AS exam_id, e.course_id, q.id AS question_id,
       a.id AS answer_id, a.is_correct
FROM exams e
JOIN questions q ON q.exam_id = e.id
JOIN answers a ON a.question_id = q.id
WHERE e.course_id = @course_id
ORDER BY q.id, a.id;
```

Expected: one Course row with `published`, two `course_categories` rows, one Lesson, one Exam, one Question, and the created Answers.

8. Log out, open Public Catalog, search the Course title, then filter by each assigned Category. The Course must appear in both filters.

## 4. Cart and checkout: Student → Database → My Courses

Choose a published paid Course that `student@seongon.vn` does not already own.

1. Log in as Student.
2. Add Course A to Cart.
3. Refresh the page; Course A must remain because the authenticated Cart is API/DB-backed.
4. In phpMyAdmin, run:

```sql
SET @student_id := (
  SELECT id FROM users WHERE email = 'student@seongon.vn' LIMIT 1
);

SELECT id, user_id, created_at, updated_at
FROM carts
WHERE user_id = @student_id;

SELECT ci.id AS cart_item_id, ci.cart_id, ci.user_id,
       ci.course_id, c.title, c.price
FROM cart_items ci
JOIN carts ca ON ca.id = ci.cart_id
JOIN courses c ON c.id = ci.course_id
WHERE ca.user_id = @student_id
ORDER BY ci.id;
```

5. Add Course B. The second query must return two distinct Course rows.
6. Add Course B again. It must not create a duplicate `(cart_id, course_id)` row.
7. Remove Course A. Its `cart_items` row must disappear.
8. Checkout Course B and select Card or QR payment.
9. Run:

```sql
SELECT o.id AS order_id, o.user_id, o.course_id,
       o.amount, o.total_amount, o.status, o.payment_method,
       o.transaction_ref, o.paid_at
FROM orders o
WHERE o.user_id = @student_id
ORDER BY o.id DESC
LIMIT 10;

SELECT e.id AS enrollment_id, e.user_id, e.course_id,
       e.order_id, e.enrolled_at, e.expires_at
FROM enrollments e
WHERE e.user_id = @student_id
ORDER BY e.id DESC
LIMIT 10;

SELECT ci.id, ci.course_id
FROM cart_items ci
JOIN carts ca ON ca.id = ci.cart_id
WHERE ca.user_id = @student_id;
```

Expected: a paid Order and one matching Enrollment exist; Course B no longer exists in `cart_items`.

10. Open My Courses. Course B must appear.

## 5. Learning workflow

1. Open Course B from My Courses.
2. Open a Lesson and mark it complete.
3. Submit its Exam once.
4. Run:

```sql
SELECT lp.id, lp.enrollment_id, lp.lesson_id,
       lp.completed, lp.completed_at
FROM learning_progress lp
JOIN enrollments e ON e.id = lp.enrollment_id
WHERE e.user_id = @student_id
ORDER BY lp.id DESC
LIMIT 20;

SELECT a.id, a.enrollment_id, a.exam_id,
       a.score, a.passed, a.created_at
FROM attempts a
JOIN enrollments e ON e.id = a.enrollment_id
WHERE e.user_id = @student_id
ORDER BY a.id DESC
LIMIT 20;
```

Expected: the completed Lesson exists in `learning_progress`; the submitted Exam exists in `attempts`.

## 6. Negative checks

- Guest can see Cart navigation but must log in before authenticated Cart/Checkout access.
- A Student cannot add a Course already present in the Cart twice.
- A Student cannot add an actively enrolled Course.
- Refreshing or logging out does not make browser `localStorage` authoritative for an authenticated Cart.
- A failed payment creates no Enrollment and does not remove the purchased Cart item. The failure path is covered automatically by `CartCheckoutTest`; the normal UI intentionally uses the success path.

## 7. ERD integrity checks in phpMyAdmin

The approved 15 core tables are:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'roles', 'users', 'carts', 'cart_items', 'orders',
    'categories', 'course_categories', 'courses', 'enrollments',
    'exams', 'questions', 'answers', 'learning_progress',
    'attempts', 'lessons'
  )
ORDER BY table_name;
```

Expected: exactly 15 rows.

List all core foreign keys:

```sql
SELECT table_name, column_name,
       referenced_table_name, referenced_column_name
FROM information_schema.key_column_usage
WHERE table_schema = DATABASE()
  AND referenced_table_name IS NOT NULL
  AND table_name IN (
    'roles', 'users', 'carts', 'cart_items', 'orders',
    'categories', 'course_categories', 'courses', 'enrollments',
    'exams', 'questions', 'answers', 'learning_progress',
    'attempts', 'lessons'
  )
ORDER BY table_name, column_name;
```

The current schema is an expand/migrate deployment, not the final contract-only schema. `lesson_progress`, legacy compatibility columns, Laravel system tables, and auxiliary `reviews`, `news_posts`, and `certificates` remain intentionally. Do not delete them during this manual test.
