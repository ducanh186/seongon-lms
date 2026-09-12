import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../lib/api';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { ApiCourse, ApiReview } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../cart/CartContext';
import { EmptyState, PageSkeleton, RequestError } from '../components/AsyncState';

const FALLBACK_COURSE_IMAGE = '/generated-images/course-seo.webp';

export function CoursePage() {
  const { slug = '' } = useParams();
  const { user, token } = useAuth();
  const { add, contains, error: cartError } = useCart();
  const navigate = useNavigate();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCartNotice(null);
    Promise.all([applicationRepositories.catalog.getCourse(slug, token), applicationRepositories.catalog.listReviews(slug)])
      .then(([courseResponse, reviewResponse]) => {
        if (!active) return;
        setCourse(courseResponse.data);
        setReviews(reviewResponse.data);
      })
      .catch((reason: unknown) => active && setError(reason instanceof ApiError ? reason.message : 'Không thể tải chi tiết khóa học.'));
    return () => { active = false; };
  }, [reloadKey, slug, token]);

  if (error) return <Container sx={{ py: 6 }}><RequestError message={error} onRetry={() => setReloadKey((value) => value + 1)} /></Container>;
  if (!course) return <Container sx={{ py: 6 }}><PageSkeleton rows={4} /></Container>;

  const isStudent = user?.role === 'student';
  const isEnrolled = Boolean(isStudent && course.enrollment && !course.enrollment.is_expired);
  const isInCart = contains(course.id);
  const beginCheckout = async () => {
    try {
      if (!isInCart) await add(course.id);
      navigate(`/checkout/${course.slug}`);
    } catch {
      // CartContext exposes the API error next to the action.
    }
  };

  return (
    <Box sx={{ py: { xs: 4, md: 7 } }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 360px' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
          <Stack spacing={{ xs: 3, md: 4 }} sx={{ minWidth: 0 }}>
            <Box sx={{ maxWidth: 820 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {course.category && <Chip label={course.category.name} color="primary" variant="outlined" />}
                {course.level && <Chip label={{ beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' }[course.level]} />}
              </Stack>
              <Typography component="h1" variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, maxWidth: 760 }}>{course.title}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <Rating value={course.rating ?? 0} precision={0.1} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">{course.rating?.toFixed(1) ?? 'Chưa có'} · {course.reviews_count ?? 0} đánh giá</Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 3, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{course.description || 'Nội dung khóa học đang được cập nhật.'}</Typography>
            </Box>
            <Box sx={{ bgcolor: '#E9F7F5', border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}>
              <Box component="img" src={course.thumbnail ?? FALLBACK_COURSE_IMAGE} alt="" sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />
            </Box>
            <Divider />
            <Box>
              <Typography component="h2" variant="h5" fontWeight={800}>Nội dung khóa học</Typography>
              <Stack spacing={1} sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.paper', px: { xs: 2, sm: 2.5 } }} divider={<Divider flexItem />}>
                {(course.lessons ?? []).length === 0 && <Box sx={{ py: 2 }}><EmptyState title="Nội dung bài học đang được cập nhật." /></Box>}
                {(course.lessons ?? []).map((lesson) => (
                  <Stack key={lesson.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.75 }}>
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
                  <Box key={review.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.paper', p: 2.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={700}>{review.user.name}</Typography><Rating value={review.rating} size="small" readOnly /></Stack>
                    {review.comment && <Typography color="text.secondary" sx={{ mt: .5 }}>{review.comment}</Typography>}
                  </Box>
                ))}
              </Stack>
            </Box>
            {course.instructor_name && <Card component="section" role="region" aria-label="Thông tin giảng viên" variant="outlined" sx={{ borderRadius: 2.5 }}><CardContent sx={{ p: { xs: 2.5, md: 3 } }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}><Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.dark', fontSize: 28 }}>{course.instructor_name[0]}</Avatar><Box><Typography variant="overline" color="primary.dark" fontWeight={800}>Thông tin giảng viên</Typography><Typography component="h2" variant="h5" fontWeight={850}>{course.instructor_name}</Typography><Typography color="text.secondary" sx={{ mt: .75, lineHeight: 1.75 }}>{course.instructor_bio || 'Thông tin chuyên môn của giảng viên đang được cập nhật.'}</Typography></Box></Stack></CardContent></Card>}
          </Stack>
          <Card component="aside" aria-label="Thông tin đăng ký" variant="outlined" sx={{ position: { md: 'sticky' }, top: 96, borderRadius: 2.5 }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography component="h2" variant="h6" fontWeight={800}>Thông tin đăng ký</Typography>
              <Typography variant="h4" fontWeight={800} color="primary.dark" sx={{ mt: 1.5 }}>{Number(course.price) === 0 ? 'Miễn phí' : `${Number(course.price).toLocaleString('vi-VN')} đ`}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{course.lessons_count ?? course.lessons?.length ?? 0} bài học</Typography>
              {!user && <Button component={Link} to="/login" state={{ from: `/courses/${course.slug}` }} variant="contained" fullWidth sx={{ mt: 3 }}>Đăng nhập để đăng ký</Button>}
              {isStudent && isEnrolled && <>
                <Alert severity="success" sx={{ mt: 3 }}>Bạn đã đăng ký khóa học này. Tiếp tục học ngay?</Alert>
                <Button component={Link} to={`/learn/${course.id}`} variant="contained" fullWidth sx={{ mt: 1.5 }}>Xem khóa học</Button>
              </>}
              {isStudent && !isEnrolled && <Button onClick={() => void beginCheckout()} variant="contained" fullWidth sx={{ mt: 3 }}>Đăng ký khóa học</Button>}
              {isStudent && !isEnrolled && <Button variant="outlined" fullWidth sx={{ mt: 1.5 }} onClick={() => { if (isInCart) { setCartNotice('Khóa học này đã có trong giỏ hàng.'); return; } setCartNotice(null); void add(course.id); }}>{isInCart ? 'Đã có trong giỏ hàng' : 'Thêm vào giỏ hàng'}</Button>}
              {cartError && <Alert severity="error" sx={{ mt: 1.5 }}>{cartError}</Alert>}
              {cartNotice && <Alert severity="info" sx={{ mt: 1.5 }}>{cartNotice}</Alert>}
              <Stack spacing={1.25} sx={{ mt: 3 }}>
                {['Theo dõi tiến độ học', 'Bài kiểm tra cuối khóa', 'Chứng chỉ khi đạt điều kiện'].map((text) => <Stack key={text} direction="row" spacing={1} alignItems="center"><CheckRoundedIcon color="primary" fontSize="small" /><Typography variant="body2">{text}</Typography></Stack>)}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
