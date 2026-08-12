# Checklist theo dõi Feedback UI/UX Website Khóa học

> File này dành cho việc kiểm tra thủ công. Nội dung được giữ đầy đủ theo transcript và sắp xếp lại thành các nhóm để dễ tick.
>
> Nghiệm thu gần nhất: 11/08/2026. Trạng thái chuẩn nằm ở mục 13, bảng tiến độ mục 14 và nhật ký bằng chứng mục 15; các checkbox chi tiết phía trên được giữ làm mẫu tái kiểm tra thủ công.

---

# 1. Thông tin học sinhSet-Location '.\BE'
php artisan migrate --force

Set-Location '..\FE\DEMO'
npm.cmd run build

- [ ] Kiểm tra phần thông tin học sinh.
- [ ] Hệ thống hiện tại chưa biết/hiển thị được nhiều thông tin của học sinh.
- [ ] Cần xem lại để Admin có thể nắm được nhiều thông tin học sinh hơn.
- [ ] Không được làm mất những thông tin học sinh hiện có.

**Ghi chú kiểm tra:**

- Khu vực/trang:
- Trạng thái:
- Lỗi còn lại:

---

# 2. Quản lý khóa học

## 2.1 Search box và nút "Áp dụng"

- [ ] Kiểm tra lại Search box.
- [ ] Kiểm tra lại chữ/nút "Áp dụng".
- [ ] Đây là phần đã feedback trước đó nên cần xác nhận đã sửa đúng, không bỏ qua.

**Ghi chú kiểm tra:**

- Search box:
- Nút Áp dụng:
- Lỗi còn lại:

---

## 2.2 Bảng danh sách khóa học

### Ý chính từ feedback

Trang danh sách khóa học chủ yếu là nơi người dùng/Admin vào để **xem danh sách khóa học**.

Việc tạo khóa học mới không xảy ra thường xuyên.

Vì vậy phần danh sách khóa học phải dễ nhìn, dễ đọc và không được có cảm giác bảng bị vỡ layout.

### Các ý phải kiểm tra

- [ ] Bảng danh sách khóa học không còn bị lẹm/mất cột.
- [ ] Không còn tình trạng phải kéo ra kéo vào một cách bất tiện mới xem được bảng.
- [ ] Nếu vẫn cần scroll ngang thì scroll phải có chủ đích và không làm lệch bảng.
- [ ] Header và nội dung bảng có cùng số lượng cột.
- [ ] Không còn tình trạng Header chỉ thấy khoảng:
  - Trạng thái
  - Học phí
  - Thao tác
  trong khi dữ liệu phía dưới lại có khoảng 6 cột.
- [ ] Header "Thao tác" nằm đúng vị trí.
- [ ] Header "Thao tác" thẳng với dữ liệu tương ứng.
- [ ] Các Header khác cũng phải thẳng với dữ liệu bên dưới.
- [ ] Bảng nhìn ổn trên desktop.

**Ghi chú kiểm tra:**

- Số cột Header:
- Số cột Row:
- Có scroll ngang không:
- Cột bị lệch:
- Lỗi còn lại:

---

## 2.3 Làm giao diện giống Prototype hơn

- [ ] Khi vào Khóa học / Danh mục khóa học, giao diện phải gần với Prototype hơn.
- [ ] Trải nghiệm phải theo logic/tư duy của Prototype.
- [ ] Không nên để UI hiện tại khác Prototype quá nhiều.
- [ ] Giao diện phải thân thiện hơn.
- [ ] Không tự ý đổi Information Architecture nếu không cần thiết.

**Ghi chú kiểm tra:**

- Mức độ giống Prototype:
- Phần còn khác:
- Lỗi UX:

---

# 3. Quản lý Blog / Tin tức

- [ ] Admin phải có phần quản lý Blog/Tin tức.
- [ ] Website có phần Tin tức thì phía Admin cũng phải có khu vực quản lý tương ứng.
- [ ] Nếu code đã có module quản lý nội dung thì nên reuse, không tạo trùng.

**Ghi chú kiểm tra:**

- Có menu quản lý Tin tức chưa:
- Có tạo/sửa/xóa nội dung được không:
- Lỗi còn lại:

---

# 4. Header website

## 4.1 Thiếu mục Tin tức

- [ ] Header phải có mục "Tin tức".
- [ ] Bấm vào phải đi đúng trang/khu vực Tin tức.

**Ghi chú kiểm tra:**

- Có hiển thị:
- Link đúng:
- Lỗi còn lại:

---

# 5. Header khi đăng nhập Admin

## 5.1 Menu "Saigon Admin"

Hiện tại khi Admin đăng nhập, Header đang xuất hiện các mục kiểu:

- Course / Khóa học
- Khóa học của tôi
- Quản trị

Feedback cho rằng cách này không hợp logic.

### Cần kiểm tra

- [ ] Xem lại menu/header khi login Admin.
- [ ] Menu Admin phải phục vụ vai trò quản trị.
- [ ] Không để các mục dành cho Student xuất hiện không hợp lý.

---

## 5.2 Xóa "Khóa học của tôi" khỏi Admin

- [ ] Admin không được thấy "Khóa học của tôi".
- [ ] Admin không được bị coi như Student.
- [ ] Nếu một Admin muốn học thì phải đăng ký/dùng tài khoản Student riêng.

**Ghi chú kiểm tra:**

- Admin còn thấy My Courses không:
- Admin menu hiện tại:
- Lỗi còn lại:

---

# 6. Header khi đăng nhập Student

## 6.1 Notice / Notification

- [ ] Student phải có Notice/Notification.
- [ ] Đây là ý đã feedback trước đó nên phải kiểm tra lại.
- [ ] Nếu đã có backend/logic notification thì phải đảm bảo UI truy cập được.

**Ghi chú kiểm tra:**

- Có Notice chưa:
- Có hoạt động không:
- Lỗi còn lại:

---

## 6.2 Giỏ hàng

- [ ] Student phải có nút Giỏ hàng.
- [ ] Đây cũng là ý đã feedback trước đó.
- [ ] Giỏ hàng phải phù hợp với flow mua/đăng ký khóa học hiện tại.

**Ghi chú kiểm tra:**

- Có Cart chưa:
- Cart hoạt động:
- Lỗi còn lại:

---

# 7. "Khóa học của tôi" trên Header Student

## Luồng mong muốn

Khi Student bấm vào Avatar / avatar học viên demo thì xổ ra một box/dropdown.

Dropdown tối thiểu có:

- Hồ sơ
- Khóa học của tôi

### Cần kiểm tra

- [ ] Xóa button "Khóa học của tôi" đứng riêng trên Header.
- [ ] Có Avatar dropdown.
- [ ] Dropdown có "Hồ sơ".
- [ ] Dropdown có "Khóa học của tôi".
- [ ] Không để "Khóa học của tôi" bị duplicate cả trên Header lẫn trong dropdown.

**Ghi chú kiểm tra:**

- Button riêng đã xóa:
- Avatar dropdown:
- Hồ sơ:
- Khóa học của tôi:
- Lỗi còn lại:

---

# 8. Dashboard nhỏ ở trang "Khóa học của tôi"

## 8.1 Thứ tự chữ và số

Các thống kê gồm:

- Tổng khóa học
- Đang học
- Đã hoàn thành

Feedback yêu cầu:

- Chữ ở trên.
- Số ở dưới.

Ví dụ đúng:

**Tổng khóa học**
3

### Cần kiểm tra

- [ ] "Tổng khóa học" nằm trên số.
- [ ] Số tổng khóa học nằm dưới.
- [ ] "Đang học" nằm trên số.
- [ ] Số đang học nằm dưới.
- [ ] "Đã hoàn thành" nằm trên số.
- [ ] Số đã hoàn thành nằm dưới.
- [ ] Không còn bị lộn thứ tự.

**Ghi chú kiểm tra:**

- Tổng khóa học:
- Đang học:
- Đã hoàn thành:
- Lỗi còn lại:

---

## 8.2 Background màu trắng của Dashboard

Feedback: phần background trắng đang bị lẹm/không tách riêng rõ.

### Cần kiểm tra

- [ ] Background trắng được tách thành section rõ ràng.
- [ ] Không bị tràn sang khu vực khác.
- [ ] Không bị lẹm.
- [ ] Padding hợp lý.
- [ ] Margin hợp lý.
- [ ] Container đúng.
- [ ] Overflow không làm hỏng section.
- [ ] Border/radius nếu có phải hợp lý.

**Ghi chú kiểm tra:**

- Background:
- Padding:
- Margin:
- Overflow:
- Lỗi còn lại:

---

# 9. Bộ lọc trạng thái khóa học

## Thứ tự hiện tại

- Đang học
- Đã hoàn thành
- Tất cả

## Thứ tự yêu cầu

1. Tất cả
2. Đang học
3. Đã hoàn thành

### Cần kiểm tra

- [ ] "Tất cả" đứng đầu.
- [ ] "Đang học" đứng thứ hai.
- [ ] "Đã hoàn thành" đứng cuối.
- [ ] Logic filter vẫn hoạt động đúng.

**Ghi chú kiểm tra:**

- Thứ tự:
- Filter hoạt động:
- Lỗi còn lại:

---

# 10. Thêm khóa học Demo trạng thái "Đã hoàn thành"

Mục đích là để demo đầy đủ flow sau khi học xong.

Ví dụ flow:

Student
→ Khóa học của tôi
→ Đã hoàn thành
→ Chọn khóa học
→ Chứng chỉ
→ Tải chứng chỉ

### Cần kiểm tra

- [ ] Có ít nhất 1 khóa học Demo ở trạng thái "Đã hoàn thành".
- [ ] Khóa học đó xuất hiện trong tab/filter "Đã hoàn thành".
- [ ] Có thể dùng khóa học này để demo.
- [ ] Nếu chức năng chứng chỉ đã có thì phải đi được tới flow tải chứng chỉ.
- [ ] Không xóa các khóa học demo khác đang có.

**Ghi chú kiểm tra:**

- Tên course demo:
- Trạng thái:
- Có hiện trong Completed:
- Chứng chỉ:
- Download:
- Lỗi còn lại:

---

# 11. Call To Action "Khám phá thêm"

Feedback: nút "Khám phá thêm" đang bị chìm vào background.

### Cần kiểm tra

- [ ] Nút "Khám phá thêm" nổi bật hơn.
- [ ] Màu/background của button tương đồng với các primary button khác.
- [ ] Không bị chìm vào background.
- [ ] Vẫn phù hợp Prototype / design system hiện tại.

**Ghi chú kiểm tra:**

- Màu button:
- Contrast:
- Có nổi bật:
- Lỗi còn lại:

---

# 12. Checklist tổng hợp

## Student Information

- [ ] Bổ sung/hiển thị tốt hơn thông tin học sinh.

## Course Management

- [ ] Search box đúng.
- [ ] Nút "Áp dụng" đúng.
- [ ] Bảng không lẹm cột.
- [ ] Header và row cùng số cột.
- [ ] Header và data thẳng hàng.
- [ ] "Thao tác" không bị lệch.
- [ ] Không scroll ngang bất tiện.
- [ ] UI danh sách khóa học giống Prototype hơn.

## Blog / News

- [ ] Có quản lý Blog/Tin tức trong Admin.

## Main Header

- [ ] Có mục Tin tức.

## Admin

- [ ] Menu Admin hợp logic.
- [ ] Không còn "Khóa học của tôi".
- [ ] Không trộn logic Admin và Student.

## Student Header

- [ ] Có Notice.
- [ ] Có Cart.
- [ ] Không còn button My Courses riêng.
- [ ] Avatar dropdown hoạt động.
- [ ] Dropdown có Hồ sơ.
- [ ] Dropdown có Khóa học của tôi.

## My Courses

- [ ] Label ở trên, số ở dưới.
- [ ] Background trắng không lẹm.
- [ ] Tabs theo thứ tự Tất cả -> Đang học -> Đã hoàn thành.

## Demo

- [ ] Có Completed demo course.
- [ ] Có thể demo certificate flow nếu chức năng tồn tại.

## CTA

- [ ] "Khám phá thêm" nổi bật.

---

# 13. Kết quả nghiệm thu cuối

Chỉ coi là xong khi:

- [x] Bảng Course List không còn lỗi lệch Header/Data.
- [x] Không mất cột.
- [x] UI Course List gần Prototype.
- [x] Admin có quản lý Tin tức.
- [x] Header website có Tin tức.
- [x] Admin không còn My Courses.
- [x] Student có Notice.
- [x] Student có Cart.
- [x] My Courses nằm trong Avatar dropdown.
- [x] Không còn button My Courses duplicate trên Header.
- [x] Dashboard statistic đúng thứ tự Label -> Number.
- [x] Background trắng dashboard sạch, không lẹm.
- [x] Tab theo thứ tự All -> In Progress -> Completed.
- [x] Có một Completed demo course.
- [x] Demo được certificate flow nếu chức năng đã có.
- [x] Button "Khám phá thêm" đủ nổi bật.
- [x] Không có ý nào trong feedback bị bỏ qua.

---

# 14. Bảng theo dõi tiến độ

| # | Hạng mục | Trạng thái | Đã kiểm tra | Ghi chú |
|---|---|---|---|---|
| 1 | Thông tin học sinh | Đạt | [x] | Admin Users có tên, email, SĐT, số khóa đăng ký, ngày tạo, trạng thái và thao tác. |
| 2 | Search box / Áp dụng | Đạt | [x] | Đã kiểm tra trực tiếp ở Admin Users/Courses. |
| 3 | Course List table | Đạt sau sửa | [x] | 9 header/9 cell; cột Thao tác sticky bên phải; giá và action không wrap. |
| 4 | Course UI theo Prototype | Đạt | [x] | List-first, filter rõ, form tạo chỉ mở theo yêu cầu. |
| 5 | Blog / News Management | Đạt | [x] | Có tab quản lý và flow CRUD/publish/hide đã kiểm tra. |
| 6 | Header có Tin tức | Đạt | [x] | Guest, Student, Admin đều có link `/news`. |
| 7 | Admin Header | Đạt | [x] | Có Quản trị; không có Notice/Cart của Student. |
| 8 | Xóa My Courses khỏi Admin | Đạt | [x] | Không hiển thị ở desktop/mobile Admin. |
| 9 | Student Notice | Đạt | [x] | Icon Notice hiển thị và mở menu được. |
| 10 | Student Cart | Đạt | [x] | Icon/badge và checkout một khóa hoạt động. |
| 11 | Avatar Dropdown | Đạt | [x] | Có Hồ sơ, Khóa học của tôi, Đăng xuất. |
| 12 | My Courses Dashboard | Đạt | [x] | Label trên, số dưới; section trắng sạch ở 375 px và desktop. |
| 13 | Course Filter Order | Đạt | [x] | Tất cả → Đang học → Đã hoàn thành. |
| 14 | Khóa học hoàn thành mẫu | Đạt sau sửa | [x] | Đổi thành `Thực hành xây dựng kế hoạch SEO 90 ngày`, tiến độ 100%; không còn tên Demo/Latin. |
| 15 | Certificate Demo Flow | Đạt | [x] | CTA tải chứng chỉ hiển thị; endpoint PDF đã trả 200 và `%PDF`. |
| 16 | Explore More CTA | Đạt | [x] | Primary teal, tương phản rõ trên desktop/mobile. |

| 17 | Hover dropdown toàn bộ desktop Header | Đạt sau sửa | [x] | Mọi control có dropdown (`Khóa học`, `Thông báo`, `Tài khoản`) đều mở bằng hover/focus, animation 200ms và delay đóng 200ms; các link trực tiếp không mở menu ngoài ý muốn. |

---

# 15. Nhật ký nghiệm thu 11/08/2026

- Công cụ kiểm tra độc lập: Codex in-app Browser và `browser-use` CLI.
- Thư mục ảnh đã mở và kiểm tra trực tiếp: `D:\CODE\seongon-lms-ui-tracker-evidence\2026-08-11\verified`.
- Ảnh chụp sai trạng thái, thiếu cột hoặc bị lặp do full-page stitching được chuyển khỏi bộ nghiệm thu sang `D:\CODE\seongon-lms-ui-tracker-evidence\2026-08-11\rejected`.
- Lỗi phát hiện khi kiểm tra live: Users/Courses gọi API theo từng ký tự và nút `Áp dụng` có thể dùng request cũ, khiến ảnh search vẫn chứa dữ liệu không liên quan.
- Sửa theo TDD: `AdminPage.test.tsx` RED `2 failed / 14 passed` → GREEN `16/16`; Users/Courses chỉ gửi filter sau khi bấm `Áp dụng`.

## 15.1 Đối chiếu từng hạng mục với ảnh đã duyệt

| # | Hạng mục | Ảnh đã duyệt | Nội dung nhìn thấy trong ảnh |
|---|---|---|---|
| 1 | Thông tin học sinh | `admin-users-all-columns-search-applied-desktop-1920.png` | Đủ 7 cột: Học viên, Email, SĐT, Khóa đã đăng ký, Ngày tạo, Trạng thái, Thao tác. |
| 2 | Search box / Áp dụng | `admin-users-all-columns-search-applied-desktop-1920.png`, `admin-courses-all-columns-desktop-1920.png` | Query hiển thị trong input, nút `Áp dụng` hiển thị, kết quả còn đúng 1 row. |
| 3 | Course List table | `admin-courses-all-columns-desktop-1920.png`, `admin-courses-table-desktop-1280.png` | 9 header/9 cell, thấy đủ `Thao tác`; ảnh 1280 chứng minh wrapper cuộn ngang có chủ đích. |
| 4 | Course UI theo Prototype | `admin-courses-all-columns-desktop-1920.png` | List-first, filter rõ, form tạo không mở sẵn, có nút `Tạo khóa học mới`. |
| 5 | Blog / News Management | `admin-news-draft-desktop.png`, `admin-news-published-desktop.png`, `admin-news-edited-desktop.png`, `admin-news-hidden-draft-desktop.png`, `admin-news-deleted-desktop.png`, `public-news-edited-visible-desktop.png`, `public-news-hidden-desktop.png` | Có đủ draft → publish → edit → public visible → hide → public absent → delete. |
| 6 | Header có Tin tức | `guest-home-header-desktop.png`, `student-my-courses-desktop.png`, `admin-courses-all-columns-desktop-1920.png`, `guest-mobile-menu-390.png`, `student-mobile-menu-375.png`, `admin-mobile-menu-390.png` | Guest, Student, Admin đều thấy `Tin tức` trên desktop/mobile. |
| 7 | Admin Header | `admin-courses-all-columns-desktop-1920.png`, `admin-mobile-menu-390.png` | Có `Quản trị` và tài khoản Admin; không có Notice/Cart Student. |
| 8 | Xóa My Courses khỏi Admin | `admin-mobile-menu-390.png`, `admin-courses-all-columns-desktop-1920.png` | Không có `Khóa học của tôi` trong Header/menu Admin. |
| 9 | Student Notice | `student-notification-menu-desktop.png`, `student-notification-menu-mobile-375.png` | Icon mở được menu `Bạn chưa có thông báo mới.`. |
| 10 | Student Cart | `student-cart-two-items-desktop.png`, `student-checkout-one-course-desktop.png`, `student-cart-one-remaining-desktop.png`, `student-mobile-menu-375.png` | Badge 2 → checkout một khóa → còn đúng 1 khóa/badge 1; mobile có Cart. |
| 11 | Avatar Dropdown | `student-avatar-menu-desktop.png`, `student-avatar-menu-mobile-375.png` | Có Hồ sơ, Khóa học của tôi, Đăng xuất; không có button My Courses đứng riêng. |
| 12 | My Courses Dashboard | `student-my-courses-desktop.png`, `student-my-courses-mobile-top-375.png` | Section trắng sạch; label trên, số dưới ở desktop và 375 px. |
| 13 | Course Filter Order | `student-completed-filter-mobile-top-375.png` | `Tất cả → Đang học → Đã hoàn thành`; tab Completed được chọn và chỉ còn khóa hoàn thành. |
| 14 | Khóa học hoàn thành mẫu | `my-courses-curated-1440-viewport.png` | `Thực hành xây dựng kế hoạch SEO 90 ngày`, 2/2 bài học, 100%, trạng thái Hoàn thành; không còn tên Demo/Latin. |
| 15 | Certificate Demo Flow | `student-completed-filter-mobile-top-375.png` và `C:\Users\AL\Downloads\certificate-SEONGON-2026-ZJHFV73Q.pdf` | CTA `Tải chứng chỉ` hiển thị; file tải thật 878052 bytes, signature `%PDF`. |
| 16 | Explore More CTA | `student-my-courses-mobile-top-375.png`, `student-my-courses-desktop.png` | `Khám phá thêm` là primary teal, tương phản rõ trên desktop/mobile. |

---

# 16. Nhật ký triển khai và nghiệm thu 12/08/2026

- Catalog đã được thay bằng 101 tên khóa học có chủ đích: 101/101 tiêu đề duy nhất, 0 tên Latin ngẫu nhiên, 0 tiêu đề chứa `Demo`.
- My Courses live hiển thị `Thực hành xây dựng kế hoạch SEO 90 ngày`, `SEO Foundation: Xây nền tảng tăng trưởng bền vững`, `Xây dựng hệ thống Internal Link`, `SEO cho trang sản phẩm và danh mục`.
- Admin Portal bỏ sidebar, dùng top navigation 6 mục; dashboard không scroll ngang ở 1280/1440 px và nhãn tháng không chồng nhau.
- News toolbar đã kiểm tra lại sau sửa: Search, Status, `Áp dụng`, `Tạo tin tức` không chồng lấn.
- Watch build đã chứng minh build lần đầu và rebuild sau khi chạm file nguồn; `Infra\watch-build-web-windows.bat --verify` trả exit code 0.
- Full regression cuối: Backend 67/67 (381 assertions), Frontend 23 files/96 tests, production build và watch-build verify đều exit code 0.

## 16.1 Ảnh mới đã mở và kiểm tra trực tiếp

| Hạng mục | Ảnh đạt | Kiểm tra trực quan |
|---|---|---|
| Admin Overview 1280 | `overview-1280-final.png` | KPI, biểu đồ, tỷ lệ hoàn thành, bảng khóa học phổ biến rõ; nhãn tháng không chồng. |
| Admin Overview 1440 + Header | `overview-1440-viewport-final.png` | Top navigation đủ 6 mục, không sidebar, không overflow ngang, dữ liệu thật đã render. |
| Admin News editor | `news-editor-1440-checked.png` | Toolbar không chồng nút; form và bảng phân cấp rõ. |
| My Courses curated | `my-courses-curated-1440-viewport.png` | Đúng tài khoản Student, 4 tên khóa học biên tập, ảnh đúng chủ đề, 0 tên Latin/Demo. |

Thư mục bằng chứng: `D:\CODE\seongon-lms-feedback-v2-evidence\2026-08-12\admin-redesign`.
