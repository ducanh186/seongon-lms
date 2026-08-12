# TODO LIST FEEDBACK UI/UX WEBSITE KHÓA HỌC

## 1. Thông tin học sinh

* [ ] Xem lại phần thông tin học sinh.

  * Hiện tại hệ thống **không biết/không hiển thị được nhiều thông tin về học sinh**.
  * Cần xem xét bổ sung hoặc tổ chức lại thông tin học sinh để quản trị viên có thể nắm được nhiều thông tin hơn.

---

# 2. Quản lý khóa học

## 2.1. Search box và nút “Áp dụng”

* [ ] Xử lý phần **Search box** và chữ/nút **“Áp dụng”** theo feedback trước đó.

  * Phần này đã được feedback nhiều lần nên không cần nhắc lại thêm.

---

## 2.2. Giao diện danh sách khóa học

* [ ] Thiết kế lại UI của **Danh sách khóa học**.

### Vấn đề hiện tại

Trang danh sách khóa học chủ yếu là nơi người dùng/quản trị viên vào để **xem danh sách khóa học**.

Việc tạo một khóa học mới không diễn ra thường xuyên, chỉ lâu lâu mới tạo thêm một khóa học mới.

Tuy nhiên UI hiện tại đang khiến phần danh sách khóa học trông chưa hợp lý và chưa thân thiện.

### Các lỗi cần sửa

* [ ] Sửa tình trạng bảng danh sách khóa học bị **lẹm/mất một số cột**.

* [ ] Hạn chế tình trạng phải **kéo ngang ra/kéo vào** mới xem được đầy đủ nội dung bảng.

  * Hiện tại trải nghiệm nhìn khá xấu và bất tiện.

* [ ] Kiểm tra lại số lượng cột giữa **Header** và **nội dung bảng**.

Hiện tại Header chỉ thấy các cột:

1. Trạng thái
2. Học phí
3. Thao tác

Trong khi phần nội dung bên dưới lại đang có khoảng:

1. Cột 1
2. Cột 2
3. Cột 3
4. Cột 4
5. Cột 5
6. Cột 6

=> Header và nội dung bảng đang **không khớp nhau**.

* [ ] Sửa vị trí Header **“Thao tác”**.

  * Hiện tại Header “Thao tác” đang bị lệch sang một bên.
  * Cần căn lại cho đúng với cột dữ liệu bên dưới.

---

## 2.3. Làm UI danh sách khóa học giống Prototype hơn

* [ ] Điều chỉnh giao diện **Danh mục/Danh sách khóa học** để giống với Prototype đã thiết kế hơn.

### Mong muốn

Khi người dùng:

> Bấm vào “Khóa học” → vào “Danh mục khóa học”

thì trải nghiệm và tư duy sử dụng nên đi theo Prototype đã thiết kế.

Giao diện hiện tại đang khác Prototype khá nhiều và tạo cảm giác kém thân thiện hơn.

=> Cần ưu tiên làm UI gần với Prototype để người dùng cảm thấy quen thuộc và dễ hiểu hơn.

---

# 3. Quản lý Blog / Tin tức

* [ ] Bổ sung phần **Quản lý Blog / Tin tức**.

Hiện tại không thấy phần quản lý Blog/Tin tức.

Trong khi website khóa học có một phần **Tin tức**, nên phía quản trị cũng cần có chức năng quản lý nội dung này.

---

# 4. Header của website

## 4.1. Thiếu mục “Tin tức”

* [ ] Bổ sung mục **Tin tức** trên Header của website.

Hiện tại trên Header đang không có phần Tin tức trong khi website có chức năng/nội dung Tin tức.

---

# 5. Header khi đăng nhập tài khoản Admin

## 5.1. Kiểm tra nút “Saigon Admin”

* [ ] Kiểm tra lại hành vi khi bấm vào **Saigon Admin** trên Header sau khi đăng nhập.

Hiện tại khi Admin đăng nhập, Header đang xuất hiện các mục như:

* Course / Khóa học
* Khóa học của tôi
* Quản trị

Cách hiển thị này đang khá kỳ và chưa đúng logic của tài khoản Admin.

---

## 5.2. Xóa “Khóa học của tôi” khỏi tài khoản Admin

* [ ] Không hiển thị **“Khóa học của tôi”** đối với tài khoản Admin.

Lý do:

Quản trị viên không phải là học viên nên về logic sẽ **không có khóa học của tôi**.

Nếu một quản trị viên trong công ty muốn học khóa học thì họ phải:

> Đăng ký một tài khoản Student như người dùng bình thường.

Do đó Role Admin và Student cần được tách logic rõ ràng.

---

# 6. Header khi đăng nhập tài khoản Student

## 6.1. Thiếu Notice

* [ ] Bổ sung **Notice/Notification** cho tài khoản học viên.

Hiện tại khi đăng nhập bằng tài khoản học viên thì không thấy phần Notice.

Phần này đã được feedback trước đó.

---

## 6.2. Thiếu nút Giỏ hàng

* [ ] Bổ sung nút **Giỏ hàng** trên Header cho tài khoản học viên.

Hiện tại sau khi đăng nhập Student thì không có nút Giỏ hàng.

Phần này cũng đã được feedback trước đó.

---

# 7. “Khóa học của tôi” trên Header Student

* [ ] Xóa Button **“Khóa học của tôi”** khỏi Header.

Không cần đặt một Button “Khóa học của tôi” trực tiếp trên Header.

### Luồng mong muốn

Khi người dùng bấm vào:

> Avatar học viên Demo

thì xổ xuống một Box/Dropdown gồm:

* Hồ sơ
* Khóa học của tôi

Do đó đã có “Khóa học của tôi” trong Dropdown của Avatar thì **không cần thêm một Button “Khóa học của tôi” trên Header nữa**.

---

# 8. Dashboard nhỏ trong trang “Khóa học của tôi”

## 8.1. Sửa thứ tự Label và số

Hiện tại có ba số lớn thể hiện:

* Tổng khóa học
* Đang học
* Đã hoàn thành

Nhưng phần hiển thị đang bị lộn vị trí.

* [ ] Sửa lại vị trí Label và Number.

### Cách hiển thị mong muốn

Ví dụ:

**Tổng khóa học**
3

Tức là:

> Chữ “Tổng khóa học” ở trên
> Số “3” ở dưới

Hiện tại đang bị đảo/lộn thứ tự.

---

## 8.2. Sửa Background của Dashboard

* [ ] Tách rõ phần **Background màu trắng** của Dashboard nhỏ.

Hiện tại Background màu trắng đang bị **lẹm/tràn sang khu vực khác**, tạo cảm giác phần Dashboard chưa được tách thành một Section rõ ràng.

Cần kiểm tra lại:

* Container
* Background
* Padding
* Margin
* Border/Section

để khu vực này rõ ràng hơn.

---

# 9. Bộ lọc trạng thái khóa học

Hiện tại phía dưới các số lớn đang có các trạng thái:

* Đang học
* Đã hoàn thành
* Tất cả

Thứ tự này chưa đúng Logic.

* [ ] Đổi thứ tự thành:

1. **Tất cả**
2. **Đang học**
3. **Đã hoàn thành**

### Logic mong muốn

Người dùng sẽ xem toàn bộ khóa học trước, sau đó mới lọc theo từng trạng thái cụ thể.

Vì vậy:

> Tất cả → Đang học → Đã hoàn thành

sẽ hợp lý hơn:

> Đang học → Đã hoàn thành → Tất cả

---

# 10. Thêm khóa học Demo ở trạng thái “Đã hoàn thành”

* [ ] Thêm ít nhất **1 khóa học Demo có trạng thái “Đã hoàn thành”**.

Mục đích là để có thể Demo đầy đủ User Flow.

Ví dụ:

> Student vào “Khóa học của tôi”
> → chọn “Đã hoàn thành”
> → thấy khóa học đã học xong
> → thực hiện luồng tải chứng chỉ

Khóa học Demo này dùng để trình diễn những chức năng như:

* Khóa học đã hoàn thành
* Chứng chỉ
* Tải chứng chỉ
* Các luồng liên quan sau khi hoàn thành khóa học

---

# 11. Call To Action “Khám phá thêm”

* [ ] Làm nổi bật Button **“Khám phá thêm”**.

Hiện tại Button này đang bị chìm vào Background nên chưa tạo được cảm giác đây là Call To Action chính.

### Yêu cầu

Đổi Background/Button Color để nó **cùng màu hoặc tương đồng với các Button chính còn lại**.

Mục tiêu:

* Button nổi bật hơn
* Dễ nhận biết đây là Call To Action
* Không bị chìm vào Background hiện tại

---

# TODO TỔNG HỢP

## Admin / Backend Management

* [ ] Bổ sung/thể hiện thêm thông tin học sinh.
* [ ] Xử lý Search box và nút “Áp dụng” theo feedback trước.
* [ ] Sửa UI bảng danh sách khóa học.
* [ ] Sửa tình trạng bảng bị mất/lẹm cột.
* [ ] Giảm việc phải Scroll ngang bảng.
* [ ] Đồng bộ số cột giữa Header và Data Row.
* [ ] Căn lại Header “Thao tác”.
* [ ] Làm giao diện danh sách khóa học gần Prototype hơn.
* [ ] Bổ sung phần quản lý Blog/Tin tức.

## Website Header

* [ ] Thêm mục Tin tức.
* [ ] Kiểm tra lại Header khi đăng nhập Admin.
* [ ] Xóa “Khóa học của tôi” khỏi Header Admin.
* [ ] Tách Logic Role Admin và Student.
* [ ] Thêm Notice cho Student.
* [ ] Thêm Giỏ hàng cho Student.
* [ ] Xóa Button “Khóa học của tôi” khỏi Header Student.
* [ ] Đưa “Khóa học của tôi” vào Dropdown Avatar.
* [ ] Dropdown Avatar gồm ít nhất:

  * Hồ sơ
  * Khóa học của tôi

## Trang “Khóa học của tôi”

* [ ] Sửa thứ tự Label và số ở phần thống kê.
* [ ] “Tổng khóa học” nằm trên, số nằm dưới.
* [ ] Kiểm tra lại “Đang học”.
* [ ] Kiểm tra lại “Đã hoàn thành”.
* [ ] Tách Background trắng của Dashboard cho rõ ràng.
* [ ] Sửa thứ tự Tab thành:

  * Tất cả
  * Đang học
  * Đã hoàn thành
* [ ] Thêm 1 khóa học Demo ở trạng thái “Đã hoàn thành”.
* [ ] Đảm bảo có thể Demo luồng tải chứng chỉ.
* [ ] Làm nổi bật Call To Action “Khám phá thêm”.
* [ ] Đổi màu Button “Khám phá thêm” để không bị chìm vào Background.
