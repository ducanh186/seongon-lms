import { Box, Card, CardContent, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { ApiAdminStats } from '../lib/contracts';

function formatMonth(value: string) {
  const [year, month] = value.split('-');
  return `${month}/${year.slice(-2)}`;
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
      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-end' }}>
        Dữ liệu trực tiếp từ hệ thống
      </Typography>
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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 3 }}>
        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 12px 28px rgba(16,46,56,.05)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography component="h2" variant="h6" fontWeight={800}>Ghi danh 12 tháng gần nhất</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Số lượt học viên bắt đầu khóa học theo từng tháng.</Typography>
            {stats.monthly_enrollments.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 3 }}>Chưa có dữ liệu ghi danh theo tháng.</Typography>
            ) : (
              <Box role="img" aria-label="Biểu đồ ghi danh theo tháng" sx={{ display: 'grid', gridTemplateColumns: `repeat(${stats.monthly_enrollments.length}, minmax(48px, 1fr))`, alignItems: 'end', gap: 1.5, minHeight: 240, mt: 3 }}>
                {stats.monthly_enrollments.map((item) => (
                  <Stack key={item.month} alignItems="center" justifyContent="flex-end" spacing={1} sx={{ position: 'relative', height: '100%' }}>
                    <Typography variant="caption" fontWeight={800}>{item.total}</Typography>
                    <Box sx={{ width: '70%', maxWidth: 42, minWidth: 18, height: `${Math.max(8, item.total / maxMonthly * 150)}px`, bgcolor: 'primary.main', borderRadius: '5px 5px 0 0' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ writingMode: 'horizontal-tb', whiteSpace: 'nowrap' }}>{formatMonth(item.month)}</Typography>
                    <Box component="span" data-visually-hidden="true" sx={{ position: 'absolute', inset: 0, width: 1, maxWidth: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{item.month}: {item.total} lượt ghi danh</Box>
                  </Stack>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#EAF7F7', borderColor: 'rgba(0,137,148,.2)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography component="h2" variant="h6" fontWeight={800}>Tỷ lệ hoàn thành</Typography>
            <Typography variant="h2" fontWeight={850} color="primary.dark" sx={{ mt: 3, letterSpacing: '-.04em' }}>{stats.completion_rate}%</Typography>
            <LinearProgress aria-label="Tỷ lệ hoàn thành khóa học" variant="determinate" value={Math.min(100, stats.completion_rate)} sx={{ mt: 2, height: 10, borderRadius: 5, bgcolor: 'rgba(0,137,148,.14)' }} />
            <Typography color="text.secondary" sx={{ mt: 2 }}>{stats.certificates} chứng chỉ trên {stats.enrollments} lượt ghi danh.</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ p: 3, pb: 2 }}>
            <Typography component="h2" variant="h6" fontWeight={800}>Khóa học phổ biến</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Xếp hạng theo tổng lượt ghi danh thực tế.</Typography>
          </Box>
          {stats.popular_courses.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3, pt: 1 }}>Chưa có khóa học được ghi danh.</Typography>
          ) : (
            <Table aria-label="Khóa học phổ biến">
              <TableHead><TableRow sx={{ bgcolor: 'grey.50' }}><TableCell sx={{ width: 80, fontWeight: 800 }}>Hạng</TableCell><TableCell sx={{ fontWeight: 800 }}>Khóa học</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>Ghi danh</TableCell></TableRow></TableHead>
              <TableBody>{stats.popular_courses.map((course, index) => <TableRow key={course.id} hover><TableCell><Typography color="primary.dark" fontWeight={850}>{String(index + 1).padStart(2, '0')}</Typography></TableCell><TableCell><Typography fontWeight={700}>{course.title}</Typography></TableCell><TableCell align="right"><Typography fontWeight={800}>{course.enrollments_count}</Typography></TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
