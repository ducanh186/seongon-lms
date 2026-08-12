import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import { GlobalHeader } from './GlobalHeader';
import { PublicFooter } from './PublicFooter';

export function Layout() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <GlobalHeader />
      <Box component="main" sx={{ flexGrow: 1 }}><Outlet /></Box>
      <PublicFooter />
    </Box>
  );
}
