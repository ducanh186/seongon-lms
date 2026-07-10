import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { Link } from 'react-router';

const benefits = [
  { icon: SchoolOutlinedIcon, title: 'Lộ trình rõ ràng', detail: 'Học theo thứ tự bài học và luôn biết bước tiếp theo.' },
  { icon: InsightsOutlinedIcon, title: 'Tiến độ minh bạch', detail: 'Theo dõi mức hoàn thành của từng khóa học.' },
  { icon: WorkspacePremiumOutlinedIcon, title: 'Chứng chỉ hoàn thành', detail: 'Nhận chứng chỉ sau khi hoàn thành bài học và vượt qua bài thi.' },
];

export function Home() {
  return (
    <>
      <Box component="section" sx={{ bgcolor: '#E9F8F8', py: { xs: 7, md: 11 }, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 760 }}>
            <Typography variant="overline" color="primary.main" fontWeight={800}>SEONGON ACADEMY</Typography>
            <Typography component="h1" sx={{ fontSize: { xs: '2.7rem', md: '4.2rem' }, lineHeight: 1.04, letterSpacing: '-0.05em', fontWeight: 800, mt: 1 }}>
              Học marketing bằng trải nghiệm thực hành có cấu trúc.
            </Typography>
            <Typography sx={{ mt: 3, fontSize: { xs: '1.05rem', md: '1.2rem' }, color: 'text.secondary', maxWidth: 620 }}>
              Khám phá khóa học, học video theo lộ trình, làm bài kiểm tra cuối khóa và lưu lại thành quả của bạn.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button component={Link} to="/courses" variant="contained" endIcon={<ArrowForwardIcon />}>Khám phá khóa học</Button>
              <Button component={Link} to="/login" variant="outlined">Bắt đầu học</Button>
            </Stack>
          </Box>
        </Container>
      </Box>
      <Container component="section" maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Typography component="h2" variant="h4" fontWeight={800}>Một nơi cho toàn bộ quá trình học</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mt: 4 }}>
          {benefits.map(({ icon: Icon, title, detail }) => (
            <Box key={title} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <Icon color="primary" sx={{ fontSize: 34 }} />
              <Typography component="h3" variant="h6" fontWeight={800} sx={{ mt: 2 }}>{title}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{detail}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </>
  );
}
