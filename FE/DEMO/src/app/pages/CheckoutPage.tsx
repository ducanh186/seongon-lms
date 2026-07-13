import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Divider, FormControl, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiCourse, ApiOrder } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/AsyncState';

export function CheckoutPage() {
  const { slug = '' } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [method, setMethod] = useState<'card' | 'qr'>('qr');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.course(slug).then(({ data }) => setCourse(data)).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Không thể tải khóa học.'));
  }, [slug]);

  const createOrder = async () => {
    if (!token || !course) return;
    setSubmitting(true); setError(null);
    try {
      const result = await api.createOrder(token, course.id);
      setOrder(result.data);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể tạo đơn hàng.');
    } finally { setSubmitting(false); }
  };

  const pay = async () => {
    if (!token || !order) return;
    setSubmitting(true); setError(null);
    try {
      await api.payOrder(token, order.id, method);
      navigate('/my-courses', { state: { notice: 'Thanh toán thành công. Bạn đã có thể bắt đầu học.' } });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Thanh toán chưa hoàn tất. Bạn có thể thử lại.');
    } finally { setSubmitting(false); }
  };

  if (!course && !error) return <Container sx={{ py: 6 }}><PageSkeleton rows={3} /></Container>;
  if (!course) return <Container sx={{ py: 6 }}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Box sx={{ py: { xs: 5, md: 8 }, minHeight: '70dvh' }}><Container maxWidth="md"><Card><CardContent sx={{ p: { xs: 3, md: 5 } }}>
      <Chip label="Thanh toán demo" color="secondary" variant="outlined" size="small" />
      <Typography component="h1" variant="h3" sx={{ mt: 2 }}>Xác nhận đăng ký</Typography>
      <Box sx={{ mt: 3, p: 2.5, borderRadius: 3, bgcolor: 'primary.light' }}><Typography fontWeight={700}>{course.title}</Typography><Typography variant="h5" color="primary.dark" fontWeight={800} sx={{ mt: 1 }}>{Number(course.price) === 0 ? 'Miễn phí' : `${Number(course.price).toLocaleString('vi-VN')} đ`}</Typography></Box>
      <Stack spacing={2} sx={{ mt: 4 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!order ? <Button size="large" variant="contained" disabled={submitting} aria-busy={submitting} onClick={() => void createOrder()}>{submitting ? 'Đang tạo đơn...' : 'Tạo đơn đăng ký'}</Button> : <>
          <Divider />
          <Typography fontWeight={700}>Chọn phương thức thanh toán giả lập</Typography>
          <FormControl><RadioGroup value={method} onChange={(event) => setMethod(event.target.value as 'card' | 'qr')}><FormControlLabel value="qr" control={<Radio />} label="QR banking (giả lập)" /><FormControlLabel value="card" control={<Radio />} label="Thẻ thanh toán (giả lập)" /></RadioGroup></FormControl>
          <Alert severity="info">Đây là cổng thanh toán mock của môi trường demo. Bấm xác nhận để hoàn tất đơn.</Alert>
          <Button size="large" variant="contained" disabled={submitting} aria-busy={submitting} onClick={() => void pay()}>{submitting ? 'Đang xác nhận...' : 'Xác nhận thanh toán'}</Button>
        </>}
        <Button component={Link} to={`/courses/${course.slug}`} variant="text">Quay lại chi tiết khóa học</Button>
      </Stack>
    </CardContent></Card></Container></Box>
  );
}
