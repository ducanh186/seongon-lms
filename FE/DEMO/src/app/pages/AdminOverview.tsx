import { Box, Card, CardContent, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { ApiAdminStats } from '../lib/contracts';

// Full year on purpose: `09/25` reads as a day/month date to reviewers.
function formatMonth(value: string) {
  const [year, month] = value.split('-');
  return `${month}/${year}`;
}

export function AdminOverview({ stats }: { stats: ApiAdminStats }) {
  const maxMonthly = Math.max(1, ...stats.monthly_enrollments.map((item) => item.total));
  const kpis = [
    ['Học viên', stats.students.toLocaleString('vi-VN')],
    ['Khóa học', stats.courses.toLocaleString('vi-VN')],
    ['Ghi danh', stats.enrollments.toLocaleString('vi-VN')],
    ['Doanh thu', `${stats.revenue.toLocaleString('vi-VN')} đ`],
  ];

  return (
    <Stack spacing={3}>
      <Box
        data-testid="admin-kpi-strip"
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
      >
        {kpis.map(([label, value], index) => (
          <Box key={label} sx={{ position: 'relative', px: 3, py: 2.5, borderLeft: index ? '1px solid' : 0, borderColor: 'divider', '&::before': { content: '""', position: 'absolute', left: 0, right: 0, top: 0, height: 3, bgcolor: index === 3 ? 'primary.dark' : 'primary.main' } }}>
            <Typography color="text.secondary" variant="body2" fontWeight={650}>{label}</Typography>
            <Typography variant="h5" fontWeight={850} color="primary.dark" sx={{ mt: 0.75, whiteSpace: 'nowrap' }}>{value}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 280px' }, alignItems: 'start', gap: 2.5 }}>
        <Card variant="outlined" sx={{ minWidth: 0, borderRadius: 3, boxShadow: '0 12px 28px rgba(16,46,56,.05)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography component="h2" variant="h6" fontWeight={800}>Ghi danh 12 tháng gần nhất</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Số lượt học viên bắt đầu khóa học theo từng tháng.</Typography>
            {stats.monthly_enrollments.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 3 }}>Chưa có dữ liệu ghi danh theo tháng.</Typography>
            ) : (
              <Box role="img" aria-label="Biểu đồ ghi danh theo tháng" sx={{ display: 'grid', gridTemplateColumns: `repeat(${stats.monthly_enrollments.length}, minmax(0, 1fr))`, alignItems: 'end', gap: 0.5, minHeight: 190, mt: 2 }}>
                {stats.monthly_enrollments.map((item) => (
                  <Stack key={item.month} alignItems="center" justifyContent="flex-end" spacing={1} sx={{ position: 'relative', height: '100%' }}>
                    <Typography variant="caption" fontWeight={800}>{item.total}</Typography>
                    <Box sx={{ width: '64%', maxWidth: 34, minWidth: 16, height: `${Math.max(8, item.total / maxMonthly * 110)}px`, bgcolor: 'primary.main', borderRadius: '5px 5px 0 0' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ writingMode: 'horizontal-tb', whiteSpace: 'nowrap', fontSize: 11 }}>{formatMonth(item.month)}</Typography>
                    <Box component="span" data-visually-hidden="true" sx={{ position: 'absolute', inset: 0, width: 1, maxWidth: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{item.month}: {item.total} lượt ghi danh</Box>
                  </Stack>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Card data-testid="completion-rate-card" variant="outlined" sx={{ width: '100%', alignSelf: 'start', borderRadius: 3, bgcolor: '#EAF7F7', borderColor: 'rgba(0,137,148,.2)' }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography component="h2" variant="h6" fontWeight={800}>Tỷ lệ hoàn thành</Typography>
            <Typography variant="h3" fontWeight={850} color="primary.dark" sx={{ mt: 1.5, letterSpacing: '-.04em' }}>{stats.completion_rate}%</Typography>
            <LinearProgress aria-label="Tỷ lệ hoàn thành khóa học" variant="determinate" value={Math.min(100, stats.completion_rate)} sx={{ mt: 1.5, height: 8, borderRadius: 4, bgcolor: 'rgba(0,137,148,.14)' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>{stats.certificates} chứng chỉ trên {stats.enrollments} lượt ghi danh.</Typography>
          </CardContent>
        </Card>
        <Card component="section" role="region" aria-label="Trạng thái khóa học" variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography component="h2" variant="subtitle1" fontWeight={800}>Khóa học đã xuất bản</Typography>
            <Typography variant="h5" color="primary.dark" fontWeight={850}>{stats.published_courses} / {stats.courses}</Typography>
            <Typography variant="body2" color="text.secondary">{Math.max(0, stats.courses - stats.published_courses)} bản nháp</Typography>
          </CardContent>
        </Card>
        </Stack>
      </Box>

      <Card variant="outlined" sx={{ minWidth: 0, maxWidth: '100%', borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ minWidth: 0, p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', p: 3 }}>
            <Typography component="h2" variant="h6" fontWeight={800}>Khóa học phổ biến</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Xếp hạng theo tổng lượt ghi danh thực tế.</Typography>
          </Box>
          {stats.popular_courses.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3, pt: 1 }}>Chưa có khóa học được ghi danh.</Typography>
          ) : (
            <Box sx={{ px: 3, pb: 3 }}><TableContainer data-testid="popular-courses-table-container" sx={{ width: '100%', maxWidth: 960, mx: 'auto', overflowX: 'auto' }}>
              <Table aria-label="Khóa học phổ biến" sx={{ width: '100%', tableLayout: 'fixed' }}>
                <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}><TableCell align="center" sx={{ width: 72, fontWeight: 800 }}>Hạng</TableCell><TableCell sx={{ fontWeight: 800 }}>Khóa học</TableCell><TableCell align="center" sx={{ width: 96, fontWeight: 800 }}>Ghi danh</TableCell></TableRow></TableHead>
                <TableBody>{stats.popular_courses.map((course, index) => <TableRow key={course.id}><TableCell align="center"><Typography color="primary.dark" fontWeight={850}>{String(index + 1).padStart(2, '0')}</Typography></TableCell><TableCell><Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{course.title}</Typography></TableCell><TableCell align="center"><Typography fontWeight={800}>{course.enrollments_count}</Typography></TableCell></TableRow>)}</TableBody>
              </Table>
            </TableContainer></Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
