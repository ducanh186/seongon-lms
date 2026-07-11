import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link, useLocation } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiEnrollment } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/AsyncState';

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
  return <Box sx={{ py: { xs: 4, md: 7 }, bgcolor: '#f7fafb', minHeight: '70dvh' }}><Container maxWidth="lg"><Stack spacing={3}>
    <Box><Typography component="h1" variant="h3" fontWeight={800}>Khóa học của tôi</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Tiếp tục từ bài học gần nhất và theo dõi tiến độ từng lộ trình.</Typography></Box>
    {notice && <Alert severity="success">{notice}</Alert>}
    {error && <Alert severity="error">{error}</Alert>}
    {loading && <PageSkeleton rows={3} />}
    {!loading && !error && enrollments.length === 0 && <Alert severity="info" action={<Button component={Link} to="/courses" color="inherit" size="small">Khám phá</Button>}>Bạn chưa đăng ký khóa học nào.</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
      {enrollments.map((enrollment) => <Card key={enrollment.id} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={1.5}>
        <Typography component="h2" variant="h6" fontWeight={800}>{enrollment.course?.title ?? 'Khóa học'}</Typography>
        <Typography variant="body2" color="text.secondary">Hạn truy cập: {new Date(enrollment.expires_at).toLocaleDateString('vi-VN')}</Typography>
        <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Tiến độ</Typography><Typography variant="body2" fontWeight={700}>{enrollment.progress?.percent ?? 0}%</Typography></Stack>
        <LinearProgress variant="determinate" value={enrollment.progress?.percent ?? 0} sx={{ height: 8, borderRadius: 4 }} />
        {enrollment.is_expired ? <Alert severity="warning">Khóa học đã hết hạn truy cập.</Alert> : <Button component={Link} to={`/learn/${enrollment.course_id}`} variant="contained" endIcon={<ArrowForwardIcon />}>Tiếp tục học</Button>}
      </Stack></CardContent></Card>)}
    </Box>
  </Stack></Container></Box>;
}
