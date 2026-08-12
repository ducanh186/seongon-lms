import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { layoutTokens } from '../theme';

export function HomeHero() {
  return (
    <Box component="section" aria-label="Giới thiệu SEONGON Academy" data-surface="dark" sx={{ bgcolor: '#0B2338', color: 'common.white', overflow: 'hidden' }}>
      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3 }}>
        <Box sx={{ minHeight: 540, display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)', alignItems: 'center', gap: 5 }}>
          <Stack alignItems="flex-start" spacing={3} sx={{ py: 7, position: 'relative', zIndex: 1 }}>
            <Typography variant="overline" fontWeight={800} letterSpacing=".12em" sx={{ color: '#65D4D7' }}>
              SEONGON ACADEMY
            </Typography>
            <Typography component="h1" variant="h2" sx={{ maxWidth: 610, color: 'common.white' }}>
              Nền tảng học tập Marketing thực chiến
            </Typography>
            <Typography sx={{ maxWidth: 590, color: 'rgba(255,255,255,.76)', fontSize: 18, lineHeight: 1.8 }}>
              Học SEO, Google Ads, Content SEO và AI Search từ đội ngũ SEONGON qua lộ trình có cấu trúc, bám sát công việc thực tế.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button component={Link} to="/courses" size="large" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>
                Khám phá khóa học
              </Button>
              <Button component={Link} to="/login" size="large" variant="outlined" color="inherit" sx={{ borderColor: 'rgba(255,255,255,.5)' }}>
                Đăng ký học thử
              </Button>
            </Stack>
          </Stack>
          <Box
            component="img"
            src="/generated-images/home-hero.webp"
            alt="Đội ngũ Marketing cùng phân tích dữ liệu tăng trưởng"
            loading="eager"
            sx={{ width: 'calc(100% + 72px)', height: 540, objectFit: 'cover', objectPosition: 'center', alignSelf: 'stretch' }}
          />
        </Box>
      </Container>
    </Box>
  );
}
