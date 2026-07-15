import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { Link, useLocation } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiEnrollment } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';

type EnrollmentFilter = 'all' | 'active' | 'completed';

const filters: Array<{ value: EnrollmentFilter; label: string }> = [
  { value: 'active', label: 'Đang học' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'all', label: 'Tất cả' },
];

function isCompleted(enrollment: ApiEnrollment) {
  return (enrollment.progress?.percent ?? 0) >= 100;
}

export function MyCoursesPage() {
  const { token } = useAuth();
  const location = useLocation();
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [filter, setFilter] = useState<EnrollmentFilter>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.myCourses(token)
      .then(({ data }) => setEnrollments(data))
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Không thể tải khóa học của bạn.'))
      .finally(() => setLoading(false));
  }, [token]);

  const completedCount = useMemo(() => enrollments.filter(isCompleted).length, [enrollments]);
  const activeCount = enrollments.length - completedCount;
  const visibleEnrollments = useMemo(() => enrollments.filter((enrollment) => {
    if (filter === 'completed') return isCompleted(enrollment);
    if (filter === 'active') return !isCompleted(enrollment);
    return true;
  }), [enrollments, filter]);

  const notice = (location.state as { notice?: string } | null)?.notice;

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, minHeight: '70dvh' }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, md: 4 }}>
          <PageHeader
            eyebrow="KHÔNG GIAN HỌC TẬP"
            title="Khóa học của tôi"
            description="Tiếp tục bài học, theo dõi tiến độ và hoàn thành lộ trình của bạn."
            action={<Button component={Link} to="/courses" variant="outlined">Khám phá thêm</Button>}
          />
          {notice && <Alert severity="success">{notice}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {loading && <PageSkeleton rows={3} />}

          {!loading && !error && (
            <>
              <Box
                sx={{
                  position: { xs: 'sticky', sm: 'static' },
                  top: { xs: 72, sm: 'auto' },
                  zIndex: { xs: 10, sm: 'auto' },
                  px: { xs: 1, sm: 0 },
                  py: { xs: 1, sm: 0 },
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1}>
                  <Box
                    component="section"
                    aria-label="Tiến độ học tập"
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2.5,
                      bgcolor: 'background.paper',
                      overflow: 'hidden',
                    }}
                  >
                    {[
                      { label: 'Tổng khóa học', value: enrollments.length, icon: <MenuBookOutlinedIcon /> },
                      { label: 'Đang học', value: activeCount, icon: <PlayCircleOutlineIcon /> },
                      { label: 'Đã hoàn thành', value: completedCount, icon: <CheckCircleOutlineIcon /> },
                    ].map((item, index) => (
                      <Stack
                        key={item.label}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 0.25, sm: 1.5 }}
                        alignItems={{ xs: 'center', sm: 'center' }}
                        sx={{
                          p: { xs: 1, sm: 2 },
                          minWidth: 0,
                          textAlign: { xs: 'center', sm: 'left' },
                          borderLeft: index === 0 ? 0 : '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: { xs: 20, sm: 24 } } }}>{item.icon}</Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" fontWeight={800}>{item.value}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.label}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Box>

                  <Stack
                    role="toolbar"
                    direction="row"
                    spacing={1}
                    aria-label="Lọc khóa học"
                    sx={{ justifyContent: { xs: 'space-between', sm: 'flex-start' } }}
                  >
                    {filters.map((item) => (
                      <Button
                        key={item.value}
                        size="small"
                        variant={filter === item.value ? 'contained' : 'outlined'}
                        aria-pressed={filter === item.value}
                        onClick={() => setFilter(item.value)}
                        sx={{ flex: { xs: '1 1 0', sm: '0 0 auto' }, whiteSpace: 'nowrap' }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Box>

              {enrollments.length === 0 && (
                <Alert severity="info" action={<Button component={Link} to="/courses" color="inherit" size="small">Khám phá</Button>}>
                  Bạn chưa đăng ký khóa học nào.
                </Alert>
              )}
              {enrollments.length > 0 && visibleEnrollments.length === 0 && (
                <Alert severity="info">Không có khóa học phù hợp với bộ lọc này.</Alert>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
                {visibleEnrollments.map((enrollment) => {
                  const courseTitle = enrollment.course?.title ?? 'Khóa học';
                  const percent = enrollment.progress?.percent ?? 0;
                  return (
                    <Card key={enrollment.id} variant="outlined" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px minmax(0, 1fr)' }, overflow: 'hidden' }}>
                      <Box
                        component="img"
                        src={enrollment.course?.thumbnail ?? 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80'}
                        alt={`Ảnh khóa học ${courseTitle}`}
                        sx={{ width: '100%', height: { xs: 168, sm: '100%' }, minHeight: { sm: 210 }, objectFit: 'cover' }}
                      />
                      <CardContent sx={{ p: 2.5, minWidth: 0 }}>
                        <Stack spacing={1.5} height="100%">
                          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                            <Typography component="h2" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{courseTitle}</Typography>
                            <Chip size="small" label={isCompleted(enrollment) ? 'Hoàn thành' : enrollment.is_expired ? 'Hết hạn' : 'Đang học'} color={isCompleted(enrollment) ? 'success' : 'default'} variant="outlined" />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Hạn truy cập: {new Date(enrollment.expires_at).toLocaleDateString('vi-VN')}
                          </Typography>
                          <Box sx={{ mt: 'auto' }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                              <Typography variant="body2">{enrollment.progress?.completed ?? 0}/{enrollment.progress?.total ?? 0} bài học</Typography>
                              <Typography variant="body2" fontWeight={800}>{percent}%</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={percent} aria-label={`Tiến độ ${courseTitle}`} sx={{ height: 8, borderRadius: 1 }} />
                          </Box>
                          {enrollment.is_expired ? (
                            <Alert severity="warning" sx={{ py: 0 }}>Khóa học đã hết hạn truy cập.</Alert>
                          ) : (
                            <Button component={Link} to={`/learn/${enrollment.course_id}`} variant="contained" endIcon={<ArrowForwardIcon />} sx={{ alignSelf: 'flex-start' }}>
                              {isCompleted(enrollment) ? 'Xem lại khóa học' : 'Tiếp tục học'}
                            </Button>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
