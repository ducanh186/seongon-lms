import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Divider, FormControl, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../lib/api';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { ApiCourse, ApiOrder } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../cart/CartContext';
import { PageSkeleton } from '../components/AsyncState';

export function CheckoutPage() {
  const { slug = '' } = useParams();
  const { token, user, refreshUser } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [method, setMethod] = useState<'card' | 'qr'>('qr');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  useEffect(() => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
  }, [user]);

  useEffect(() => {
    applicationRepositories.catalog.getCourse(slug).then(({ data }) => setCourse(data)).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Không thể tải khóa học.'));
  }, [slug]);

  const createOrder = async () => {
    if (!token || !course) return;
    setSubmitting(true); setError(null);
    try {
      await applicationRepositories.profile.update(token, {
        name: name.trim(),
        phone: phone.trim(),
        avatar: user?.avatar ?? null,
      });
      await refreshUser();
      const result = await applicationRepositories.checkout.createOrder(token, course.id);
      setOrder(result.data);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể tạo đơn hàng.');
    } finally { setSubmitting(false); }
  };

  const pay = async () => {
    if (!token || !order) return;
    setSubmitting(true); setError(null);
    try {
      await applicationRepositories.checkout.payOrder(token, order.id, method);
      await refresh().catch(() => undefined);
      navigate('/my-courses', { state: { notice: 'Thanh toán thành công. Bạn đã có thể bắt đầu học.' } });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Thanh toán chưa hoàn tất. Bạn có thể thử lại.');
    } finally { setSubmitting(false); }
  };

  if (!course && !error) return <Container sx={{ py: 6 }}><PageSkeleton rows={3} /></Container>;
  if (!course) return <Container sx={{ py: 6 }}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Box component="section" aria-labelledby="checkout-title" sx={{ py: { xs: 5, md: 8 }, minHeight: '70dvh' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
          <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Chip label="Thanh toán demo" color="primary" variant="outlined" size="small" />
              <Typography id="checkout-title" component="h1" variant="h3" sx={{ mt: 2, fontSize: { xs: '2rem', md: '2.5rem' } }}>Xác nhận đăng ký</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Tạo đơn, chọn phương thức thanh toán và xác nhận để bắt đầu học.</Typography>

              <Stack spacing={2.5} sx={{ mt: 4 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {!order ? (
                  <Box component="form" onSubmit={(event) => { event.preventDefault(); void createOrder(); }} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default' }}>
                    <Typography component="h2" variant="h6" fontWeight={800}>Thông tin đăng ký</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>Thông tin được lấy từ tài khoản học viên và lưu lại trước khi tạo đơn.</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2, mt: 2.5 }}>
                      <TextField required label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} />
                      <TextField label="Email" value={user?.email ?? ''} disabled />
                      <TextField required label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} inputProps={{ inputMode: 'tel' }} sx={{ gridColumn: { sm: '1 / -1' } }} />
                    </Box>
                    <Button type="submit" size="large" variant="contained" disabled={submitting} aria-busy={submitting} sx={{ mt: 2.5 }}>{submitting ? 'Đang tạo đơn...' : 'Lưu thông tin và tạo đơn'}</Button>
                  </Box>
                ) : (
                  <Box sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                    <Typography component="h2" variant="h6" fontWeight={800}>Phương thức thanh toán</Typography>
                    <FormControl sx={{ mt: 1.5 }}>
                      <RadioGroup value={method} onChange={(event) => setMethod(event.target.value as 'card' | 'qr')}>
                        <FormControlLabel value="qr" control={<Radio />} label="QR banking (giả lập)" />
                        <FormControlLabel value="card" control={<Radio />} label="Thẻ thanh toán (giả lập)" />
                      </RadioGroup>
                    </FormControl>
                    <Alert severity="info" sx={{ mt: 1.5 }}>Đây là cổng thanh toán mock của môi trường demo. Bấm xác nhận để hoàn tất đơn.</Alert>
                    <Button size="large" variant="contained" disabled={submitting} aria-busy={submitting} onClick={() => void pay()} sx={{ mt: 2.5 }}>{submitting ? 'Đang xác nhận...' : 'Xác nhận thanh toán'}</Button>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card component="aside" aria-label="Tóm tắt đơn đăng ký" variant="outlined" sx={{ position: { md: 'sticky' }, top: 96, borderRadius: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography component="h2" variant="h6" fontWeight={800}>Tóm tắt đơn đăng ký</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography fontWeight={700}>{course.title}</Typography>
              <Typography variant="h5" color="primary.dark" fontWeight={800} sx={{ mt: 1.5 }}>{Number(order?.amount ?? course.price) === 0 ? 'Miễn phí' : `${Number(order?.amount ?? course.price).toLocaleString('vi-VN')} đ`}</Typography>
              <Button component={Link} to={`/courses/${course.slug}`} variant="outlined" fullWidth sx={{ mt: 3 }}>Quay lại chi tiết khóa học</Button>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
