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
import MenuIcon from '@mui/icons-material/Menu';
import { Link, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import logoSeongon from 'figma:asset/dd45f331e8a4458443255a6f01a8333b19d6c86a.png';

const publicLinks = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Khóa học', to: '/courses' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuAnchor(null);
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: 2 }}>
            <Box component={Link} to="/" aria-label="SEONGON Academy" sx={{ display: 'inline-flex', alignItems: 'center', mr: { md: 3 } }}>
              <Box component="img" src={logoSeongon} alt="SEONGON" sx={{ width: 145, height: 'auto' }} />
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
              {publicLinks.map((item) => <Button key={item.to} component={Link} to={item.to} color="inherit">{item.label}</Button>)}
              {user && <Button component={Link} to="/my-courses" color="inherit">Khóa học của tôi</Button>}
              {user?.role === 'admin' && <Button component={Link} to="/admin" color="inherit">Quản trị</Button>}
            </Stack>
            <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
            {user ? (
              <>
                <Button onClick={(event) => setMenuAnchor(event.currentTarget)} startIcon={<Avatar src={user.avatar ?? undefined} sx={{ width: 24, height: 24 }}>{user.name[0]}</Avatar>} color="primary">
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
            ) : <Button component={Link} to="/login" variant="contained">Đăng nhập</Button>}
            <IconButton onClick={() => setMobileOpen((open) => !open)} sx={{ display: { md: 'none' } }} aria-label="Mở menu"><MenuIcon /></IconButton>
          </Toolbar>
          {mobileOpen && (
            <Stack spacing={0.5} sx={{ display: { md: 'none' }, pb: 2 }}>
              {publicLinks.map((item) => <Button key={item.to} component={Link} to={item.to} onClick={closeMobile} color="inherit" sx={{ justifyContent: 'flex-start' }}>{item.label}</Button>)}
              {user && <Button component={Link} to="/my-courses" onClick={closeMobile} color="inherit" sx={{ justifyContent: 'flex-start' }}>Khóa học của tôi</Button>}
              {user?.role === 'admin' && <Button component={Link} to="/admin" onClick={closeMobile} color="inherit" sx={{ justifyContent: 'flex-start' }}>Quản trị</Button>}
            </Stack>
          )}
        </Container>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1 }}><Outlet /></Box>
      <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 3, mt: 'auto' }}>
        <Container maxWidth="lg"><Typography variant="body2" color="text.secondary">SEONGON Academy · Nền tảng học trực tuyến cho marketing thực chiến.</Typography></Container>
      </Box>
    </Box>
  );
}
