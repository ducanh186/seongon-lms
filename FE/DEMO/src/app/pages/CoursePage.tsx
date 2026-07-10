import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { Link, useParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiCourse, ApiReview } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';

const FALLBACK_COURSE_IMAGE = 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=1200&q=80';

export function CoursePage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.course(slug), api.reviews(slug)])
      .then(([courseResponse, reviewResponse]) => {
        if (!active) return;
        setCourse(courseResponse.data);
        setReviews(reviewResponse.data);
      })
      .catch((reason: unknown) => active && setError(reason instanceof ApiError ? reason.message : 'Không thể tải chi tiết khóa học.'));
    return () => { active = false; };
  }, [slug]);

  if (error) return <Container sx={{ py: 6 }}><Alert severity="error">{error}</Alert></Container>;
  if (!course) return <Box sx={{ display: 'grid', minHeight: '55dvh', placeItems: 'center' }}><CircularProgress /></Box>;

  const checkoutPath = user ? `/checkout/${course.slug}` : '/login';

  return (
    <Box sx={{ py: { xs: 4, md: 7 }, bgcolor: '#f7fafb' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.55fr) minmax(290px, .7fr)' }, gap: 4, alignItems: 'start' }}>
          <Stack spacing={3}>
            <Box component="img" src={course.thumbnail ?? FALLBACK_COURSE_IMAGE} alt={course.title} sx={{ width: '100%', height: { xs: 220, md: 360 }, objectFit: 'cover', borderRadius: 3 }} />
            <Box>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {course.category && <Chip label={course.category.name} color="primary" variant="outlined" />}
                {course.level && <Chip label={{ beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }[course.level]} />}
              </Stack>
              <Typography component="h1" variant="h3" fontWeight={800}>{course.title}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <Rating value={course.rating ?? 0} precision={0.1} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">{course.rating?.toFixed(1) ?? 'Chưa có'} · {course.reviews_count ?? 0} đánh giá</Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 3, whiteSpace: 'pre-wrap' }}>{course.description || 'Nội dung khóa học đang được cập nhật.'}</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography component="h2" variant="h5" fontWeight={800}>Nội dung khóa học</Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {(course.lessons ?? []).map((lesson) => (
                  <Stack key={lesson.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
                    <PlayCircleOutlineIcon color="primary" />
                    <Typography sx={{ flexGrow: 1 }}>{lesson.position}. {lesson.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{lesson.duration ? `${Math.ceil(lesson.duration / 60)} phút` : ''}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Divider />
            <Box>
              <Typography component="h2" variant="h5" fontWeight={800}>Đánh giá học viên</Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {reviews.length === 0 && <Typography color="text.secondary">Khóa học chưa có đánh giá công khai.</Typography>}
                {reviews.map((review) => (
                  <Box key={review.id} sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={700}>{review.user.name}</Typography><Rating value={review.rating} size="small" readOnly /></Stack>
                    {review.comment && <Typography color="text.secondary" sx={{ mt: .5 }}>{review.comment}</Typography>}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
          <Card sx={{ position: { md: 'sticky' }, top: 92, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h4" fontWeight={800} color="primary.main">{Number(course.price).toLocaleString('vi-VN')} đ</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{course.lessons_count ?? course.lessons?.length ?? 0} bài học · Truy cập trong 1 năm</Typography>
              <Button component={Link} to={checkoutPath} state={{ course }} variant="contained" fullWidth sx={{ mt: 3 }}>
                {user ? 'Đăng ký khóa học' : 'Đăng nhập để đăng ký'}
              </Button>
              <Stack spacing={1} sx={{ mt: 3 }}>
                <Typography variant="body2">✓ Theo dõi tiến độ học</Typography>
                <Typography variant="body2">✓ Bài kiểm tra cuối khóa</Typography>
                <Typography variant="body2">✓ Chứng chỉ khi đạt điều kiện</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
