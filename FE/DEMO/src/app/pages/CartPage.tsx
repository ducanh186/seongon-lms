import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, Divider, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { EmptyState } from '../components/AsyncState';
import { useCart } from '../cart/CartContext';
import { ApiError } from '../lib/api';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { CartItem } from '../cart/cartStorage';

function formatPrice(price: string): string {
  return `${Number(price).toLocaleString('vi-VN')} đ`;
}

export function CartPage() {
  const { items, remove, replace } = useCart();
  const [displayItems, setDisplayItems] = useState<CartItem[]>(items);
  const [reconciliationNotice, setReconciliationNotice] = useState<string | null>(null);
  const total = displayItems.reduce((sum, item) => sum + Number(item.price), 0);

  useEffect(() => {
    setDisplayItems(items);
  }, [items]);

  useEffect(() => {
    let active = true;
    if (items.length === 0) {
      setReconciliationNotice(null);
      return () => { active = false; };
    }

    void Promise.all(items.map(async (item) => {
      try {
          const { data: course } = await applicationRepositories.catalog.getCourse(item.slug);
        return {
          item: {
            courseId: course.id,
            slug: course.slug,
            title: course.title,
            price: String(course.price),
            thumbnail: course.thumbnail,
          } satisfies CartItem,
          unavailable: false,
        };
      } catch (reason) {
        return { item, unavailable: reason instanceof ApiError && reason.status === 404 };
      }
    })).then((results) => {
      if (!active) return;

      const unavailableCount = results.filter((result) => result.unavailable).length;
      const nextItems = results.filter((result) => !result.unavailable).map((result) => result.item);
      const changed = nextItems.length !== items.length || nextItems.some((item, index) => {
        const previous = items[index];
        return item.courseId !== previous.courseId
          || item.slug !== previous.slug
          || item.title !== previous.title
          || item.price !== previous.price
          || item.thumbnail !== previous.thumbnail;
      });

      setDisplayItems(nextItems);
      if (changed) replace(nextItems);
      setReconciliationNotice(unavailableCount > 0 ? 'Một số khóa học không còn công khai và đã được xóa khỏi giỏ hàng.' : null);
    });

    return () => { active = false; };
  }, [items, replace]);

  return (
    <Box component="section" aria-labelledby="cart-title" sx={{ py: { xs: 5, md: 8 }, minHeight: '70dvh' }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Typography id="cart-title" component="h1" variant="h3" fontWeight={800}>Giỏ hàng</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>{displayItems.length} khóa học</Typography>
          </Box>

          {reconciliationNotice && <Alert severity="info">{reconciliationNotice}</Alert>}

          {displayItems.length === 0 ? (
            <EmptyState title="Giỏ hàng của bạn đang trống." action={<Button component={Link} to="/courses" variant="contained">Khám phá khóa học</Button>} />
          ) : (
            <Stack spacing={2}>
              {displayItems.map((item) => (
                <Card key={item.courseId} variant="outlined" sx={{ borderRadius: 2.5 }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography component="h2" variant="h6" fontWeight={800}>{item.title}</Typography>
                        <Typography color="primary.dark" fontWeight={700} sx={{ mt: .75 }}>{formatPrice(item.price)}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button component={Link} to={`/checkout/${item.slug}`} variant="contained" aria-label={`Thanh toán ${item.title}`}>Thanh toán</Button>
                        <Button variant="text" color="inherit" onClick={() => remove(item.courseId)} aria-label={`Xóa ${item.title} khỏi giỏ hàng`}>Xóa</Button>
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
