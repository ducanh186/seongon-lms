import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface StudentWorkspaceShellProps {
  curriculum: ReactNode;
  content: ReactNode;
  aside: ReactNode;
}

export function StudentWorkspaceShell({ curriculum, content, aside }: StudentWorkspaceShellProps) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '260px minmax(0, 1fr) 260px',
          gap: 2.5,
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
          sx={{ minWidth: 0 }}
        >
          {aside}
        </Box>
      </Box>
    </Box>
  );
}
