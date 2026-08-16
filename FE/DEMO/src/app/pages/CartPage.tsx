import { Alert, Box, Button, Card, CardContent, Container, Divider, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { useCart } from '../cart/CartContext';
import { EmptyState, PageSkeleton } from '../components/AsyncState';

function formatPrice(price: string): string {
  return `${Number(price).toLocaleString('vi-VN')} đ`;
}

export function CartPage() {
  const { items, remove, loading, error } = useCart();
  const total = items.reduce((sum, item) => sum + Number(item.price), 0);

  if (loading) return <Container sx={{ py: 6 }}><PageSkeleton rows={3} /></Container>;

  return (
    <Box component="section" aria-labelledby="cart-title" sx={{ py: { xs: 5, md: 8 }, minHeight: '70dvh' }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Typography id="cart-title" component="h1" variant="h3" fontWeight={800}>Giỏ hàng</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>{items.length} khóa học</Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {items.length === 0 ? (
            <EmptyState title="Giỏ hàng của bạn đang trống." action={<Button component={Link} to="/courses" variant="contained">Khám phá khóa học</Button>} />
          ) : (
            <Stack spacing={2}>
              {items.map((item) => (
                <Card key={item.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography component="h2" variant="h6" fontWeight={800}>{item.title}</Typography>
                        <Typography color="primary.dark" fontWeight={700} sx={{ mt: .75 }}>{formatPrice(item.price)}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button component={Link} to={`/checkout/${item.slug}`} variant="contained" aria-label={`Thanh toán ${item.title}`}>Thanh toán</Button>
                        <Button variant="text" color="inherit" onClick={() => void remove(item.courseId)} aria-label={`Xóa ${item.title} khỏi giỏ hàng`}>Xóa</Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography component="h2" variant="h6" fontWeight={800}>Tổng cộng</Typography>
                    <Typography variant="h5" color="primary.dark" fontWeight={800}>{formatPrice(String(total))}</Typography>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">Mỗi khóa học được thanh toán riêng theo quy trình đăng ký hiện có.</Typography>
                </CardContent>
              </Card>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
