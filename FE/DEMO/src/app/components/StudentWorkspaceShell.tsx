import { useState, type ReactNode } from 'react';
import { Box, Button, Modal } from '@mui/material';
import { useIsMobile } from './ui/use-mobile';

interface StudentWorkspaceShellProps {
  curriculum: ReactNode;
  content: ReactNode;
  aside: ReactNode;
}

export function StudentWorkspaceShell({ curriculum, content, aside }: StudentWorkspaceShellProps) {
  const isCompact = useIsMobile();
  const [curriculumOpen, setCurriculumOpen] = useState(false);

  return (
    <Box sx={{ minWidth: 0 }}>
      {isCompact && (
        <Button
          variant="outlined"
          fullWidth
          aria-controls="mobile-course-curriculum"
          aria-expanded={curriculumOpen}
          onClick={() => setCurriculumOpen(true)}
          sx={{ mb: 2 }}
        >
          Mở nội dung khóa học
        </Button>
      )}
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
        {!isCompact && (
          <Box component="nav" aria-label="Nội dung khóa học" sx={{ minWidth: 0 }}>
            {curriculum}
          </Box>
        )}
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
      <Modal
        open={isCompact && curriculumOpen}
        onClose={() => setCurriculumOpen(false)}
      >
        <Box
          sx={{
            position: 'fixed',
            inset: '0 auto 0 0',
            width: 'min(88vw, 360px)',
            overflowY: 'auto',
            bgcolor: 'background.paper',
            boxShadow: 12,
            p: 2,
          }}
        >
          <Button fullWidth onClick={() => setCurriculumOpen(false)} sx={{ mb: 1 }}>
            Đóng nội dung khóa học
          </Button>
          <Box
            id="mobile-course-curriculum"
            component="nav"
            aria-label="Nội dung khóa học"
            onClick={() => setCurriculumOpen(false)}
          >
            {curriculum}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
