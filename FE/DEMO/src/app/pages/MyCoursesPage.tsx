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
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { Link, useLocation } from 'react-router';
import { api, ApiError } from '../lib/api';
import type { ApiEnrollment, ApiEnrollmentSummary, Paginated } from '../lib/contracts';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';

type EnrollmentFilter = 'all' | 'active' | 'completed';

const filters: Array<{ value: EnrollmentFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang học' },
  { value: 'completed', label: 'Đã hoàn thành' },
];

function isCompleted(enrollment: ApiEnrollment) {
  return (enrollment.progress?.percent ?? 0) >= 100;
}

export function MyCoursesPage() {
  const { token } = useAuth();
  const location = useLocation();
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [summary, setSummary] = useState<ApiEnrollmentSummary | null>(null);
  const [pagination, setPagination] = useState<Paginated<ApiEnrollment>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<EnrollmentFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError(null);
    api.myCourses(token, page)
      .then((response) => {
        if (!active) return;
        setEnrollments(response.data);
        setSummary(response.summary ?? null);
        setPagination(response.meta);
      })
      .catch((reason) => active && setError(reason instanceof ApiError ? reason.message : 'Không thể tải khóa học của bạn.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, token]);

  const completedCount = useMemo(() => enrollments.filter(isCompleted).length, [enrollments]);
  const activeCount = enrollments.length - completedCount;
  const displayedSummary = summary ?? {
    total: pagination?.total ?? enrollments.length,
    active: activeCount,
    completed: completedCount,
  };
  const visibleEnrollments = useMemo(() => enrollments.filter((enrollment) => {
    if (filter === 'completed') return isCompleted(enrollment);
    if (filter === 'active') return !isCompleted(enrollment);
    return true;
  }), [enrollments, filter]);

  const notice = (location.state as { notice?: string } | null)?.notice;

  const downloadCertificate = async (enrollment: ApiEnrollment) => {
    if (!token) return;

    try {
      const blob = await api.downloadCertificate(token, enrollment.course_id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${enrollment.certificate?.certificate_code ?? enrollment.course_id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể tải chứng chỉ.');
    }
  };

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, minHeight: '70dvh' }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, md: 4 }}>
          <PageHeader
            eyebrow="KHÔNG GIAN HỌC TẬP"
            title="Khóa học của tôi"
            description="Tiếp tục bài học, theo dõi tiến độ và hoàn thành lộ trình của bạn."
            action={<Button component={Link} to="/courses" variant="contained">Khám phá thêm</Button>}
          />
          {notice && <Alert severity="success">{notice}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {loading && <PageSkeleton rows={3} />}

          {!loading && !error && (
            <>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                }}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack spacing={1.5}>
                  <Box
                    component="section"
                    aria-label="Tiến độ học tập"
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      overflow: 'hidden',
                    }}
                  >
                    {[
                      { label: 'Tổng khóa học', value: displayedSummary.total, icon: <MenuBookOutlinedIcon /> },
                      { label: 'Đang học', value: displayedSummary.active, icon: <PlayCircleOutlineIcon /> },
                      { label: 'Đã hoàn thành', value: displayedSummary.completed, icon: <CheckCircleOutlineIcon /> },
                    ].map((item, index) => (
                      <Stack
                        key={item.label}
                        spacing={0.25}
                        alignItems={{ xs: 'center', sm: 'flex-start' }}
                        sx={{
                          p: { xs: 1, sm: 2 },
                          minWidth: 0,
                          textAlign: { xs: 'center', sm: 'left' },
                          borderLeft: index === 0 ? 0 : '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: { xs: 20, sm: 24 } } }}>{item.icon}</Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>{item.label}</Typography>
                        <Typography variant="h6" fontWeight={800}>{item.value}</Typography>
                      </Stack>
                    ))}
                  </Box>

                  <Stack
                    role="toolbar"
                    direction="row"
                    spacing={1}
                    aria-label="Lọc khóa học"
                    sx={{ justifyContent: { xs: 'space-between', sm: 'flex-start' }, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}
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
                </CardContent>
              </Card>

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
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Button component={Link} to={`/learn/${enrollment.course_id}`} variant="contained" endIcon={<ArrowForwardIcon />} sx={{ alignSelf: 'flex-start' }}>
                                {isCompleted(enrollment) ? 'Xem lại khóa học' : 'Tiếp tục học'}
                              </Button>
                              {isCompleted(enrollment) && enrollment.certificate && (
                                <Button variant="outlined" onClick={() => void downloadCertificate(enrollment)}>
                                  Tải chứng chỉ
                                </Button>
                              )}
                            </Stack>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
              {(pagination?.last_page ?? 1) > 1 && (
                <Stack alignItems="center">
                  <Pagination
                    count={pagination?.last_page}
                    page={page}
                    onChange={(_event, nextPage) => setPage(nextPage)}
                    aria-label="Phân trang khóa học"
                    getItemAriaLabel={(type, itemPage) => type === 'page' ? `Trang ${itemPage}` : type === 'previous' ? 'Trang trước' : type === 'next' ? 'Trang sau' : 'Trang đầu hoặc cuối'}
                  />
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
