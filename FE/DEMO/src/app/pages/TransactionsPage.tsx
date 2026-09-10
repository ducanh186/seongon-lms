import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Container, Pagination, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import { useAuth } from '../contexts/AuthContext';
import type { ApiOrder } from '../lib/contracts';
import { paymentMethodLabel } from '../lib/payment';
import { PageSkeleton } from '../components/AsyncState';

export function TransactionsPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true); setError('');
    applicationRepositories.checkout.transactions(token, page).then(({ data, meta }) => { if (active) { setOrders(data); setPages(meta?.last_page ?? 1); } }).catch(() => { if (active) setError('Không thể tải lịch sử giao dịch.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, page, retry]);
  return <Container maxWidth="md" sx={{ py: 6 }}><Typography component="h1" variant="h4" sx={{ mb: 3 }}>Lịch sử giao dịch</Typography>
    {loading ? <PageSkeleton rows={3} /> : error ? <Alert severity="error" action={<Button onClick={() => setRetry(retry + 1)}>Thử lại</Button>}>{error}</Alert> : <Stack spacing={2}>
      {!orders.length && <Alert severity="info">Bạn chưa có giao dịch đã thanh toán.</Alert>}
      {orders.map((order) => <Card key={order.id} variant="outlined"><CardContent><Stack spacing={1}>
        <Typography variant="h6">LMS-{order.id} · {order.course?.title}</Typography>
        <Typography>{Number(order.amount).toLocaleString('vi-VN')} đ · {paymentMethodLabel(order.payment_method)} · Đã thanh toán</Typography>
        <Typography>Mã giao dịch: {order.transaction_ref ?? '—'}</Typography>
        <Typography>Thời gian: {order.paid_at ? new Date(order.paid_at).toLocaleString('vi-VN') : '—'}</Typography>
        <Button component={Link} to={`/learn/${order.course_id}`} sx={{ alignSelf: 'flex-start' }}>Vào học</Button>
      </Stack></CardContent></Card>)}
      {pages > 1 && <Pagination count={pages} page={page} onChange={(_, value) => setPage(value)} />}
    </Stack>}
  </Container>;
}
