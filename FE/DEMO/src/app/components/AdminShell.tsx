import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ExitToAppRoundedIcon from '@mui/icons-material/ExitToAppRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import { Avatar, Box, Button, IconButton, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAdminNavigationItems, type AdminSection } from '../admin/adminNavigation';

export type { AdminSection } from '../admin/adminNavigation';

interface AdminShellProps {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  children: ReactNode;
}

function getNavigationIcon(section: AdminSection) {
  switch (section) {
    case 'users':
      return <PeopleAltRoundedIcon fontSize="small" />;
    case 'orders':
      return <ReceiptLongRoundedIcon fontSize="small" />;
    case 'categories':
      return <CategoryRoundedIcon fontSize="small" />;
    case 'courses':
      return <SchoolRoundedIcon fontSize="small" />;
    case 'news':
      return <ArticleRoundedIcon fontSize="small" />;
    default:
      return <DashboardRoundedIcon fontSize="small" />;
  }
}

export function AdminShell({ active, onChange, children }: AdminShellProps) {
  const { user, logout } = useAuth();
  const compactViewport = useMediaQuery('(max-width:1199.95px)');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(compactViewport);

  useEffect(() => {
    setSidebarCollapsed(compactViewport);
  }, [compactViewport]);

  return (
    <Box sx={{ width: '100%', maxWidth: '100vw', minHeight: '100dvh', overflowX: 'clip', bgcolor: 'background.default' }}>
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
          gridTemplateColumns: sidebarCollapsed ? '76px minmax(0, 1fr)' : '230px minmax(0, 1fr)',
          width: '100%',
          maxWidth: 'none',
          minHeight: 'calc(100dvh - 72px)',
          mx: 'auto',
          transition: 'grid-template-columns 180ms ease',
        }}
      >
        <Box
          component="aside"
          data-collapsed={sidebarCollapsed ? 'true' : 'false'}
          sx={{ position: 'sticky', top: 0, alignSelf: 'start', minWidth: 0, height: 'calc(100dvh - 72px)', maxHeight: 'calc(100dvh - 72px)', bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider', overflowX: 'hidden' }}
        >
          <Stack direction="row" justifyContent={sidebarCollapsed ? 'center' : 'flex-end'} sx={{ px: sidebarCollapsed ? 1 : 2, pt: 1.5 }}>
            <Tooltip title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'} placement="right">
              <IconButton
                aria-label={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                aria-controls="admin-navigation"
                aria-expanded={!sidebarCollapsed}
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                {sidebarCollapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack
            component="nav"
            id="admin-navigation"
            aria-label="Quản trị"
            data-admin-sidebar="true"
            spacing={0.75}
            sx={{ position: 'sticky', top: 0, maxHeight: 'calc(100dvh - 124px)', overflowY: 'auto', px: sidebarCollapsed ? 1 : 2, py: 1.5 }}
          >
            {getAdminNavigationItems().map((item) => {
                  const selected = active === item.section;
                  return (
                    <Tooltip key={item.section} title={sidebarCollapsed ? item.label : ''} placement="right">
                      <Button
                        aria-label={item.label}
                        aria-pressed={selected}
                        color="inherit"
                        startIcon={getNavigationIcon(item.section)}
                        onClick={() => onChange(item.section)}
                        sx={{
                          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                          minWidth: 0,
                          minHeight: 42,
                          px: sidebarCollapsed ? 1 : 1.5,
                          borderRadius: 1.5,
                          color: selected ? 'primary.dark' : 'text.secondary',
                          bgcolor: selected ? 'rgba(0,137,148,.1)' : 'transparent',
                          fontWeight: selected ? 800 : 650,
                          '& .MuiButton-startIcon': { m: sidebarCollapsed ? 0 : undefined },
                          '&:hover': { bgcolor: 'rgba(0,137,148,.08)', color: 'primary.dark' },
                        }}
                      >
                        <Box component="span" sx={{ display: sidebarCollapsed ? 'none' : 'inline', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </Box>
                      </Button>
                    </Tooltip>
                  );
                })}
          </Stack>
        </Box>

        <Box component="main" aria-live="polite" sx={{ minWidth: 0, overflowX: 'hidden', p: { xs: 4, lg: 5 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
