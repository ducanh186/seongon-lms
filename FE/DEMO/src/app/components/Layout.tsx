import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link, Outlet } from 'react-router';
import { layoutTokens } from '../theme';
import { GlobalHeader } from './GlobalHeader';

export function Layout() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <GlobalHeader />
      <Box component="main" sx={{ flexGrow: 1 }}><Outlet /></Box>
      <Box component="footer" data-surface="dark" sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: '#102E38', color: 'common.white', py: { xs: 4, md: 5 }, mt: 'auto' }}>
        <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
            <Box>
              <Typography fontWeight={800}>SEONGON Academy</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: 'rgba(255,255,255,.7)' }}>Nền tảng học trực tuyến cho marketing thực chiến.</Typography>
            </Box>
            <Button component={Link} to="/courses" color="inherit" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,.4)' }}>Khám phá khóa học</Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
