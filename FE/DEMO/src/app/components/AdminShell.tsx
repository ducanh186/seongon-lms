import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

export type AdminSection = 'overview' | 'users' | 'categories' | 'courses' | 'reviews';

interface AdminShellProps {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  children: ReactNode;
}

const adminSections: ReadonlyArray<readonly [AdminSection, string]> = [
  ['overview', 'Dashboard'],
  ['users', 'Người dùng'],
  ['categories', 'Danh mục'],
  ['courses', 'Khóa học'],
  ['reviews', 'Đánh giá'],
];

export function AdminShell({ active, onChange, children }: AdminShellProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '232px minmax(0, 1fr)' },
        gap: { xs: 2, lg: 3 },
        minWidth: 0,
      }}
    >
      <Box component="aside" sx={{ minWidth: 0 }}>
        <Stack
          component="nav"
          aria-label="Quản trị"
          direction={{ xs: 'row', lg: 'column' }}
          spacing={0.75}
          sx={{
            position: { lg: 'sticky' },
            top: { lg: 92 },
            p: 1,
            maxWidth: '100%',
            overflowX: { xs: 'auto', lg: 'visible' },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2.5,
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: { xs: 'none', lg: 'block' }, px: 1.25, pt: 0.5 }}
          >
            Khu vực quản trị
          </Typography>
          {adminSections.map(([value, label]) => (
            <Button
              key={value}
              aria-pressed={active === value}
              variant={active === value ? 'contained' : 'text'}
              color={active === value ? 'primary' : 'inherit'}
              onClick={() => onChange(value)}
              sx={{
                justifyContent: 'flex-start',
                whiteSpace: 'nowrap',
                minHeight: 42,
                px: 1.5,
                boxShadow: 'none',
              }}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </Box>
      <Box component="section" aria-live="polite" sx={{ minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
