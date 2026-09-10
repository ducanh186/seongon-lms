<!doctype html><html lang="vi"><meta charset="utf-8"><body>
<h1>Thanh toán thành công</h1>
<p>Mã đơn hàng: <strong>LMS-{{ $order->id }}</strong></p>
<p>Khóa học: {{ $order->course->title }}</p>
<p>Số tiền: {{ number_format((float) $order->amount, 0, ',', '.') }} VND</p>
<p>Trạng thái: Đã thanh toán</p>
<p>Mã giao dịch: {{ $order->transaction_ref }}</p>
<p>Quyền truy cập đã được cấp cho tài khoản mua hàng. Đăng nhập và mở mục Khóa học của tôi để bắt đầu học. Thông tin thanh toán có tại Lịch sử giao dịch.</p>
</body></html>
