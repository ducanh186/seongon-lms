import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link, useLocation } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiEnrollment } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';

export function MyCoursesPage() {
  const { token } = useAuth();
  const location = useLocation();
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.myCourses(token).then(({ data }) => setEnrollments(data)).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Không thể tải khóa học của bạn.')).finally(() => setLoading(false));
  }, [token]);

  const notice = (location.state as { notice?: string } | null)?.notice;
  return <Box sx={{ py: { xs: 5, md: 8 }, minHeight: '70dvh' }}><Container maxWidth="lg"><Stack spacing={4}>
    <PageHeader eyebrow="KHÔNG GIAN HỌC TẬP" title="Khóa học của tôi" description="Tiếp tục từ bài học gần nhất và theo dõi tiến độ từng lộ trình." action={<Button component={Link} to="/courses" variant="outlined">Khám phá thêm</Button>} />
    {notice && <Alert severity="success">{notice}</Alert>}
    {error && <Alert severity="error">{error}</Alert>}
    {loading && <PageSkeleton rows={3} />}
    {!loading && !error && enrollments.length === 0 && <Alert severity="info" action={<Button component={Link} to="/courses" color="inherit" size="small">Khám phá</Button>}>Bạn chưa đăng ký khóa học nào.</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
      {enrollments.map((enrollment) => <Card key={enrollment.id}><Box component="img" src={enrollment.course?.thumbnail ?? 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80'} alt="" sx={{ width: '100%', height: 170, objectFit: 'cover' }} /><CardContent sx={{ p: 3 }}><Stack spacing={1.75}>
        <Typography component="h2" variant="h6">{enrollment.course?.title ?? 'Khóa học'}</Typography>
        <Typography variant="body2" color="text.secondary">Hạn truy cập: {new Date(enrollment.expires_at).toLocaleDateString('vi-VN')}</Typography>
        <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Tiến độ</Typography><Typography variant="body2" fontWeight={700}>{enrollment.progress?.percent ?? 0}%</Typography></Stack>
        <LinearProgress variant="determinate" value={enrollment.progress?.percent ?? 0} aria-label={`Tiến độ ${enrollment.course?.title ?? 'khóa học'}`} sx={{ height: 10, borderRadius: 5, bgcolor: 'primary.light' }} />
        {enrollment.is_expired ? <Alert severity="warning">Khóa học đã hết hạn truy cập.</Alert> : <Button component={Link} to={`/learn/${enrollment.course_id}`} variant="contained" endIcon={<ArrowForwardIcon />} sx={{ alignSelf: 'flex-start' }}>Tiếp tục học</Button>}
      </Stack></CardContent></Card>)}
    </Box>
  </Stack></Container></Box>;
}
