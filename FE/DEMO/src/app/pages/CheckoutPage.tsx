import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Divider, FormControl, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { ApiError } from '../lib/api';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { ApiCourse, ApiOrder, PaymentMethod } from '../lib/contracts';
import { paymentStatus, paymentStatusLabels } from '../lib/payment';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../cart/CartContext';
import { PageSkeleton } from '../components/AsyncState';

export function CheckoutPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { token, user, refreshUser } = useAuth();
  const { refresh } = useCart();
  const [search, setSearch] = useSearchParams();
  const orderId = search.get('order');
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [methods, setMethods] = useState<Array<{ code: PaymentMethod; label: string }>>([]);
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [cardChoice, setCardChoice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(orderId));
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [now, setNow] = useState(Date.now());

  useEffect(() => { setName(user?.name ?? ''); setPhone(user?.phone ?? ''); }, [user]);
  useEffect(() => {
    let active = true;
    setCourse(null); setOrder(null); setError(null);
    applicationRepositories.catalog.getCourse(slug).then(({ data }) => { if (active) setCourse(data); }).catch(() => { if (active) setError('Không thể tải khóa học.'); });
    if (token) applicationRepositories.checkout.methods(token).then(({ data }) => { if (active) { setMethods(data); setMethod(data[0]?.code ?? ''); } }).catch(() => { if (active) setError('Không thể tải phương thức thanh toán. Vui lòng tải lại trang.'); });
    return () => { active = false; };
  }, [slug, token]);

  useEffect(() => {
    if (!token || !orderId || !course || order?.id === Number(orderId)) return;
    let active = true;
    setRestoring(true);
    applicationRepositories.checkout.getOrder(token, Number(orderId)).then(({ data }) => {
      if (!active) return;
      if (data.course_id !== course.id) throw new Error('Order course mismatch');
      setOrder(data);
    }).catch(() => { if (active) setError('Không thể khôi phục đơn hàng này. Vui lòng quay lại chi tiết khóa học.'); }).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [orderId, course, token, order?.id]);

  useEffect(() => {
    if (!order || paymentStatus(order) !== 'pending') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [order?.id, order?.payment_status]);

  useEffect(() => {
    if (!token || !order || paymentStatus(order) !== 'pending') return;
    let active = true;
    const timer = window.setInterval(() => {
      applicationRepositories.checkout.getOrder(token, order.id).then(({ data }) => {
        if (!active) return;
        setOrder(data);
        setError(null);
        if (data.status === 'paid') void refresh().catch(() => undefined);
      }).catch(() => { if (active) setError('Chưa cập nhật được trạng thái. Hệ thống sẽ tự thử lại.'); });
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token, order?.id, order?.payment_status, refresh]);

  useEffect(() => {
    // UC-06 step 9: registration success redirects the student to the course page.
    if (!course || !order || paymentStatus(order) !== 'paid') return;
    const timer = window.setTimeout(() => navigate(`/learn/${course.id}`), 2000);
    return () => window.clearTimeout(timer);
  }, [course?.id, order?.id, order?.status, order?.payment_status, navigate]);

  const createOrder = async () => {
    if (!token || !course) return;
    setSubmitting(true); setError(null);
    try {
      await applicationRepositories.profile.update(token, { name: name.trim(), phone: phone.trim(), avatar: user?.avatar ?? null });
      await refreshUser();
      const result = await applicationRepositories.checkout.createOrder(token, course.id);
      setOrder(result.data); setSearch({ order: String(result.data.id) }, { replace: true });
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Không thể tạo đơn hàng.'); }
    finally { setSubmitting(false); }
  };
  const start = async () => {
    if (!token || !order || !method) return;
    setSubmitting(true); setError(null);
    try { const { data } = await applicationRepositories.checkout.startPayment(token, order.id, method); setOrder(data); setNow(Date.now()); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Không thể mở phiên thanh toán.'); }
    finally { setSubmitting(false); }
  };
  const confirm = async (outcome: 'success' | 'cancel') => {
    if (!token || !order?.payment_session) return;
    setSubmitting(true); setError(null);
    try {
      const result = await applicationRepositories.checkout.callback(token, order.id, order.payment_session.token, outcome);
      setOrder(result.order);
      if (result.order.status === 'paid') await refresh().catch(() => undefined);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Thanh toán chưa hoàn tất. Bạn có thể thử lại.'); }
    finally { setSubmitting(false); }
  };

  if (!course && !error) return <Container sx={{ py: 6 }}><PageSkeleton rows={3} /></Container>;
  if (!course) return <Container sx={{ py: 6 }}><Alert severity="error">{error}</Alert></Container>;
  const remaining = Math.max(0, Math.ceil((Date.parse(order?.payment_expires_at ?? '') - now) / 1000));
  const status = order ? paymentStatus(order) : 'draft';
  const session = order?.payment_session;
  const expired = status === 'expired' || (status === 'pending' && remaining === 0);
  const activeSession = status === 'pending' && session && !expired;
  const amount = `${Number(order?.amount ?? course.price).toLocaleString('vi-VN')} đ`;

  return <Box component="section" aria-labelledby="checkout-title" sx={{ py: { xs: 4, md: 7 }, minHeight: '70dvh' }}><Container maxWidth="lg">
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' }, gap: 3, alignItems: 'start' }}>
      <Card variant="outlined" sx={{ borderRadius: 2.5, minWidth: 0 }}><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Chip label="Thanh toán an toàn" color="primary" variant="outlined" size="small" />
        <Typography id="checkout-title" component="h1" variant="h4" sx={{ mt: 2 }}>{activeSession ? (order.payment_method === 'momo' ? 'Cổng thanh toán MoMo' : order.payment_method === 'card' ? 'Thanh toán bằng thẻ' : 'Chuyển khoản ngân hàng') : status === 'paid' ? 'Thanh toán thành công' : 'Xác nhận đăng ký'}</Typography>
        <Stack spacing={2.5} sx={{ mt: 3 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {restoring ? <PageSkeleton rows={2} /> : !order ? <Box component="form" onSubmit={(event) => { event.preventDefault(); void createOrder(); }}>
            <Typography component="h2" variant="h6">Thông tin đăng ký</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}><TextField required label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} /><TextField label="Email" value={user?.email ?? ''} disabled /><TextField label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} inputProps={{ inputMode: 'tel' }} /><Button type="submit" variant="contained" disabled={submitting}>Lưu thông tin và tạo đơn</Button></Stack>
          </Box> : status === 'paid' ? <>
            <Alert severity="success">Đã thanh toán. Quyền truy cập khóa học đã được cấp. Đang chuyển đến trang học...</Alert>
            <Button component={Link} to={`/learn/${course.id}`} variant="contained">Vào học ngay</Button><Button component={Link} to="/transactions" variant="outlined">Lịch sử giao dịch</Button><Button component={Link} to="/my-courses" variant="outlined">Khóa học của tôi</Button>
          </> : activeSession ? <>
            <Stack direction="row" spacing={2} alignItems="center">{order.payment_method === 'momo' && <Box component="img" src="/images/momo-logo.png" alt="MoMo" sx={{ width: 80, height: 80, objectFit: 'contain' }} />}<Chip label="Chờ thanh toán" /><Typography role="timer">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</Typography></Stack>
            <Typography>Mã đơn hàng: <strong>LMS-{order.id}</strong></Typography>
            <Typography>{session.merchant_name} · {course.title}</Typography>
            {session.bank && <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px minmax(0, 1fr)' }, gap: 1 }}>{[['Ngân hàng', session.bank.bank_name], ['Chủ tài khoản', session.bank.account_name], ['Số tài khoản', session.bank.account_number], ['Chi nhánh', session.bank.branch || '—'], ['Nội dung chuyển khoản', session.reference], ['Số tiền', amount]].map(([label, value]) => <Box key={label} sx={{ display: 'contents' }}><Typography component="dt" color="text.secondary">{label}</Typography><Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>{value}</Typography></Box>)}</Box>}
            {order.payment_method === 'card' ? <>
              <Alert severity="info">Đây là cổng thanh toán mô phỏng. Không nhập số thẻ, CVV hoặc mật khẩu thật.</Alert>
              <Typography component="h2" variant="h6">Chọn loại thẻ</Typography>
              <RadioGroup value={cardChoice} onChange={(event) => setCardChoice(event.target.value)}>
                <FormControlLabel value="domestic" control={<Radio />} label="Thẻ nội địa và tài khoản ngân hàng" />
                <FormControlLabel value="international" control={<Radio />} label="Thẻ thanh toán quốc tế (Visa, Mastercard, JCB)" />
              </RadioGroup>
              <Typography variant="body2" color="text.secondary">Chọn loại thẻ rồi xác nhận giao dịch giả lập. Hệ thống không xử lý hoặc lưu thông tin thẻ.</Typography>
            </> : <>
              {session.qr_payload ? <Box sx={{ alignSelf: 'center', p: 1, bgcolor: 'white', maxWidth: '100%' }}><QRCodeSVG aria-label="Mã QR thanh toán" value={session.qr_payload} size={232} marginSize={4} style={{ maxWidth: '100%', height: 'auto' }} /></Box> : <Alert severity="info">Ngân hàng chưa cấu hình QR. Thông tin chuyển khoản được hiển thị phía trên.</Alert>}
              <Typography variant="body2">{session.bank ? session.bank.instructions || 'Kiểm tra tài khoản, nhập đúng số tiền và nội dung chuyển khoản của đơn hàng.' : 'Mở ứng dụng MoMo trên điện thoại, dùng chức năng quét QR và xác nhận đúng số tiền của đơn hàng.'}</Typography>
            </>}
            {order.mock_callback_allowed && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="contained" disabled={submitting || (order.payment_method === 'card' && !cardChoice)} onClick={() => void confirm('success')}>{order.payment_method === 'card' ? 'Xác nhận thanh toán mô phỏng' : 'Tôi đã thanh toán'}</Button><Button variant="outlined" disabled={submitting} onClick={() => void confirm('cancel')}>Hủy phiên thanh toán</Button></Stack>}
          </> : <>
            {(expired || status === 'cancelled') && <Alert severity="warning">{expired ? 'Phiên thanh toán đã hết hạn.' : 'Phiên thanh toán đã hủy.'} Chọn phương thức để tạo phiên mới.</Alert>}
            <Typography component="h2" variant="h6">2. Chọn phương thức thanh toán</Typography>
            <Typography color="text.secondary">Kiểm tra thông tin đơn hàng trước khi nhấn Tiếp tục.</Typography>
            {methods.length ? <FormControl><RadioGroup value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>{methods.map((item) => <FormControlLabel key={item.code} value={item.code} control={<Radio />} label={item.label} />)}</RadioGroup></FormControl> : <Alert severity="warning">Hiện chưa có phương thức thanh toán khả dụng.</Alert>}
            <Button variant="contained" disabled={submitting || !method} onClick={() => void start()}>Tiếp tục</Button>
          </>}
        </Stack>
      </CardContent></Card>
      <Card component="aside" aria-label="Tóm tắt đơn đăng ký" variant="outlined" sx={{ position: { md: 'sticky' }, top: 96, borderRadius: 2.5 }}><CardContent sx={{ p: 3 }}>
        <Typography component="h2" variant="h6">1. Thông tin đơn hàng</Typography><Divider sx={{ my: 2 }} />
        {order && <Typography>Mã đơn hàng: LMS-{order.id}</Typography>}
        <Typography color="text.secondary" sx={{ my: 1 }}>1 khóa học</Typography><Typography fontWeight={700}>{course.title}</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}><Typography>Tạm tính: {amount}</Typography><TextField label="Mã khuyến mại" disabled helperText="Hiện chưa hỗ trợ mã khuyến mại." /><Button variant="outlined" disabled>Áp dụng</Button><Divider /><Typography variant="h6" color="primary.dark">Tổng cộng: {amount}</Typography>{order && <Typography>{paymentStatusLabels[expired ? 'expired' : status]}</Typography>}<Button component={Link} to={`/courses/${course.slug}`} variant="outlined">Quay lại chi tiết khóa học</Button></Stack>
      </CardContent></Card>
    </Box>
  </Container></Box>;
}
