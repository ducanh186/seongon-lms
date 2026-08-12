import ExitToAppRoundedIcon from '@mui/icons-material/ExitToAppRounded';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type AdminSection = 'overview' | 'users' | 'categories' | 'courses' | 'reviews' | 'news';

interface AdminShellProps {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  children: ReactNode;
}

const adminSections: ReadonlyArray<readonly [AdminSection, string]> = [
  ['overview', 'Tổng quan'],
  ['users', 'Học viên'],
  ['categories', 'Danh mục'],
  ['courses', 'Khóa học'],
  ['reviews', 'Đánh giá'],
  ['news', 'Tin tức'],
];

export function AdminShell({ active, onChange, children }: AdminShellProps) {
  const { user } = useAuth();

  return (
    <Box sx={{ width: '100%', maxWidth: '100vw', minHeight: '100dvh', overflowX: 'hidden', bgcolor: 'background.default' }}>
      <Box component="header" aria-label="Admin Portal" data-surface="dark" sx={{ bgcolor: '#102E38', color: 'common.white' }}>
        <Stack direction="row" alignItems="center" sx={{ maxWidth: 1440, height: 72, mx: 'auto', px: { xs: 4, lg: 5 } }}>
          <Box>
            <Typography variant="overline" sx={{ display: 'block', color: '#65D4D7', fontWeight: 800, lineHeight: 1.2 }}>SEONGON ACADEMY</Typography>
            <Typography variant="h6" color="common.white" sx={{ mt: 0.5, lineHeight: 1.2 }}>Admin Portal</Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button component="a" href="/" color="inherit" startIcon={<ExitToAppRoundedIcon />} sx={{ mr: 2, whiteSpace: 'nowrap' }}>
            Xem site public
          </Button>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ pl: 2, borderLeft: '1px solid rgba(255,255,255,.18)' }}>
            <Avatar src={user?.avatar ?? undefined} sx={{ width: 34, height: 34, bgcolor: 'primary.main' }}>{user?.name?.[0] ?? 'A'}</Avatar>
            <Box>
              <Typography variant="body2" color="common.white" fontWeight={750}>{user?.name ?? 'SEONGON Admin'}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.65)' }}>Quản trị hệ thống</Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack
          component="nav"
          aria-label="Quản trị"
          direction="row"
          sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 4, lg: 5 }, overflowX: 'auto' }}
        >
          {adminSections.map(([value, label]) => {
            const selected = active === value;
            return (
              <Button
                key={value}
                aria-pressed={selected}
                color="inherit"
                onClick={() => onChange(value)}
                sx={{
                  position: 'relative', minHeight: 56, px: 2.25, flexShrink: 0, whiteSpace: 'nowrap', borderRadius: 0,
                  color: selected ? 'primary.dark' : 'text.secondary', fontWeight: selected ? 800 : 650,
                  '&::after': { content: '""', position: 'absolute', left: 18, right: 18, bottom: 0, height: 3, bgcolor: selected ? 'primary.main' : 'transparent' },
                  '&:hover': { bgcolor: 'rgba(0,137,148,.06)', color: 'primary.dark' },
                }}
              >
                {label}
              </Button>
            );
          })}
        </Stack>
      </Box>

      <Box component="main" aria-live="polite" sx={{ width: '100%', maxWidth: 1440, minWidth: 0, mx: 'auto', overflowX: 'hidden', p: { xs: 4, lg: 5 } }}>
        {children}
      </Box>
    </Box>
  );
}
