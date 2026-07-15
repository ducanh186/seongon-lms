import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface StudentWorkspaceShellProps {
  curriculum: ReactNode;
  content: ReactNode;
  aside: ReactNode;
}

export function StudentWorkspaceShell({ curriculum, content, aside }: StudentWorkspaceShellProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: '240px minmax(0, 1fr)',
          lg: '260px minmax(0, 1fr) 260px',
        },
        gap: { xs: 2, lg: 2.5 },
        alignItems: 'start',
        minWidth: 0,
      }}
    >
      <Box component="nav" aria-label="Nội dung khóa học" sx={{ minWidth: 0 }}>
        {curriculum}
      </Box>
      <Box component="section" aria-label="Bài học hiện tại" sx={{ minWidth: 0 }}>
        {content}
      </Box>
      <Box
        component="aside"
        aria-label="Tiến độ và tài nguyên"
        sx={{
          minWidth: 0,
          gridColumn: { xs: 'auto', md: '1 / -1', lg: 'auto' },
        }}
      >
        {aside}
      </Box>
    </Box>
  );
}
