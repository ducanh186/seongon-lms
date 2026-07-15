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
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { layoutTokens } from '../theme';
import logoSeongon from 'figma:asset/dd45f331e8a4458443255a6f01a8333b19d6c86a.png';

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const links = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Khóa học', to: '/courses' },
    ...(user ? [{ label: 'Khóa học của tôi', to: '/my-courses' }] : []),
    ...(user?.role === 'admin' ? [{ label: 'Quản trị', to: '/admin' }] : []),
  ];

  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = async () => {
    await logout();
    setMenuAnchor(null);
    navigate('/');
  };

  const navLink = ({ label, to }: { label: string; to: string }, mobile = false) => (
    <Button
      key={to}
      component={Link}
      to={to}
      onClick={mobile ? closeMobile : undefined}
      aria-current={isActive(to) ? 'page' : undefined}
      color="inherit"
      sx={{
        justifyContent: mobile ? 'flex-start' : 'center',
        color: isActive(to) ? 'primary.dark' : 'text.primary',
        bgcolor: isActive(to) ? 'primary.light' : 'transparent',
        '&:hover': { bgcolor: 'primary.light' },
      }}
    >
      {label}
    </Button>
  );

  return (
    <AppBar
      component="header"
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth }}>
        <Toolbar disableGutters sx={{ minHeight: layoutTokens.headerHeight, gap: { xs: 1, md: 2 } }}>
          <Box
            component={Link}
            to="/"
            aria-label="SEONGON Academy - Trang chủ"
            sx={{ display: 'inline-flex', alignItems: 'center', mr: { md: 1 } }}
          >
            <Box component="img" src={logoSeongon} alt="" sx={{ width: { xs: 128, md: 148 }, height: 'auto' }} />
          </Box>
          <Stack
            component="nav"
            aria-label="Điều hướng chính"
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}
          >
            {links.map((link) => navLink(link))}
          </Stack>
          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
          <IconButton aria-label="Tìm kiếm khóa học" onClick={() => navigate('/courses')} color="primary">
            <SearchRoundedIcon />
          </IconButton>
          {user ? (
            <>
              <Button
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                startIcon={
                  <Avatar src={user.avatar ?? undefined} sx={{ width: 28, height: 28, bgcolor: 'primary.dark' }}>
                    {user.name[0]}
                  </Avatar>
                }
                color="primary"
                aria-haspopup="menu"
                aria-expanded={Boolean(menuAnchor)}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, whiteSpace: 'nowrap' }}
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
          ) : (
            <Button component={Link} to="/login" variant="contained" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              Đăng nhập
            </Button>
          )}
          <IconButton
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen((value) => !value)}
            sx={{ display: { md: 'none' } }}
          >
            {mobileOpen ? <CloseRoundedIcon /> : <MenuRoundedIcon />}
          </IconButton>
        </Toolbar>
        {mobileOpen && (
          <Stack
            id="mobile-navigation"
            component="nav"
            aria-label="Điều hướng di động"
            spacing={0.5}
            sx={{ display: { md: 'none' }, pb: 2 }}
          >
            {links.map((link) => navLink(link, true))}
            {!user && <Button component={Link} to="/login" onClick={closeMobile} variant="contained" sx={{ mt: 1 }}>Đăng nhập</Button>}
            {user && <Button component={Link} to="/profile" onClick={closeMobile} variant="outlined" sx={{ mt: 1 }}>Hồ sơ cá nhân</Button>}
            {user && <Button onClick={() => { closeMobile(); void handleLogout(); }}>Đăng xuất</Button>}
          </Stack>
        )}
      </Container>
    </AppBar>
  );
}
