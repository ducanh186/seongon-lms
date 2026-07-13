import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import logoSeongon from 'figma:asset/dd45f331e8a4458443255a6f01a8333b19d6c86a.png';

const publicLinks = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Khóa học', to: '/courses' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to);
  const linkSx = (to: string) => ({
    color: isActive(to) ? 'primary.dark' : 'text.primary',
    bgcolor: isActive(to) ? 'primary.light' : 'transparent',
    '&:hover': { bgcolor: 'primary.light' },
  });

  const handleLogout = async () => {
    await logout();
    setMenuAnchor(null);
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  const navLink = (label: string, to: string, mobile = false) => (
    <Button
      key={to}
      component={Link}
      to={to}
      onClick={mobile ? closeMobile : undefined}
      aria-current={isActive(to) ? 'page' : undefined}
      color="inherit"
      sx={{ ...linkSx(to), justifyContent: mobile ? 'flex-start' : 'center' }}
    >
      {label}
    </Button>
  );

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,.94)', backdropFilter: 'blur(14px)' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 66, md: 76 }, gap: 1.5 }}>
            <Box component={Link} to="/" aria-label="SEONGON Academy - Trang chủ" sx={{ display: 'inline-flex', alignItems: 'center', mr: { md: 2 } }}>
              <Box component="img" src={logoSeongon} alt="" sx={{ width: { xs: 132, md: 148 }, height: 'auto' }} />
            </Box>
            <Stack component="nav" aria-label="Điều hướng chính" direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
              {publicLinks.map((item) => navLink(item.label, item.to))}
              {user && navLink('Khóa học của tôi', '/my-courses')}
              {user?.role === 'admin' && navLink('Quản trị', '/admin')}
            </Stack>
            <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
            {user ? (
              <>
                <Button
                  onClick={(event) => setMenuAnchor(event.currentTarget)}
                  startIcon={<Avatar src={user.avatar ?? undefined} sx={{ width: 28, height: 28, bgcolor: 'secondary.main' }}>{user.name[0]}</Avatar>}
                  color="primary"
                  aria-haspopup="menu"
                  aria-expanded={Boolean(menuAnchor)}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  {user.name}
                </Button>
                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                  <MenuItem component={Link} to="/profile" onClick={() => setMenuAnchor(null)}>Hồ sơ</MenuItem>
                  <MenuItem component={Link} to="/my-courses" onClick={() => setMenuAnchor(null)}>Khóa học của tôi</MenuItem>
                  {user.role === 'admin' && <MenuItem component={Link} to="/admin" onClick={() => setMenuAnchor(null)}>Quản trị</MenuItem>}
                  <Divider />
                  <MenuItem onClick={() => void handleLogout()}>Đăng xuất</MenuItem>
                </Menu>
              </>
            ) : <Button component={Link} to="/login" variant="contained" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Đăng nhập</Button>}
            <IconButton
              onClick={() => setMobileOpen((open) => !open)}
              sx={{ display: { md: 'none' } }}
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
            </IconButton>
          </Toolbar>
          {mobileOpen && (
            <Stack id="mobile-navigation" component="nav" aria-label="Điều hướng di động" spacing={0.5} sx={{ display: { md: 'none' }, pb: 2 }}>
              {publicLinks.map((item) => navLink(item.label, item.to, true))}
              {user && navLink('Khóa học của tôi', '/my-courses', true)}
              {user?.role === 'admin' && navLink('Quản trị', '/admin', true)}
              {!user && <Button component={Link} to="/login" onClick={closeMobile} variant="contained" sx={{ mt: 1 }}>Đăng nhập</Button>}
              {user && <Button component={Link} to="/profile" onClick={closeMobile} variant="outlined" sx={{ mt: 1 }}>Hồ sơ cá nhân</Button>}
            </Stack>
          )}
        </Container>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1 }}><Outlet /></Box>
      <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: '#102E38', color: 'common.white', py: { xs: 4, md: 5 }, mt: 'auto' }}>
        <Container maxWidth="lg">
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
