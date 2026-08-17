import ExitToAppRoundedIcon from '@mui/icons-material/ExitToAppRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ADMIN_NAVIGATION, type AdminSection } from '../admin/adminNavigation';

export type { AdminSection } from '../admin/adminNavigation';

interface AdminShellProps {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  children: ReactNode;
}

export function AdminShell({ active, onChange, children }: AdminShellProps) {
  const { user, logout } = useAuth();

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
          <Button color="inherit" startIcon={<LogoutRoundedIcon />} onClick={() => void logout()} sx={{ mr: 2, whiteSpace: 'nowrap' }}>
            Đăng xuất
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '260px minmax(0, 1fr)',
          width: '100%',
          maxWidth: 1440,
          minHeight: 'calc(100dvh - 72px)',
          mx: 'auto',
        }}
      >
        <Box component="aside" sx={{ bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
          <Stack
            component="nav"
            aria-label="Quản trị"
            data-admin-sidebar="true"
            spacing={0.75}
            sx={{ position: 'sticky', top: 0, maxHeight: '100dvh', overflowY: 'auto', px: 2, py: 2.5 }}
          >
            {ADMIN_NAVIGATION.map((group) => (
              <Stack key={group.key} component="section" aria-label={group.label} spacing={0.25} sx={{ pb: 1.25 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ px: 1.5, pt: 0.5, fontSize: '0.68rem', fontWeight: 850, letterSpacing: '0.08em' }}
                >
                  {group.label}
                </Typography>
                {group.items.map((item) => {
                  const selected = active === item.section;
                  return (
                    <Button
                      key={item.section}
                      aria-pressed={selected}
                      color="inherit"
                      onClick={() => onChange(item.section)}
                      sx={{
                        justifyContent: 'flex-start',
                        minHeight: 38,
                        px: 1.5,
                        borderRadius: 1.5,
                        color: selected ? 'primary.dark' : 'text.secondary',
                        bgcolor: selected ? 'rgba(0,137,148,.1)' : 'transparent',
                        fontWeight: selected ? 800 : 650,
                        '&:hover': { bgcolor: 'rgba(0,137,148,.08)', color: 'primary.dark' },
                      }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box component="main" aria-live="polite" sx={{ minWidth: 0, overflowX: 'hidden', p: { xs: 4, lg: 5 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
