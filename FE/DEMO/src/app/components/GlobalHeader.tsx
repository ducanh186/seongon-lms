import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
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
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { styled } from '@mui/material/styles';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../cart/CartContext';
import { layoutTokens } from '../theme';
import { NotificationMenu } from './NotificationMenu';
import logoSeongon from 'figma:asset/dd45f331e8a4458443255a6f01a8333b19d6c86a.png';

const BrandLogo = styled('img')(({ theme }) => ({
  display: 'block',
  width: 144,
  height: 'auto',
  [theme.breakpoints.up('md')]: { width: 180 },
}));

const publicLinks = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Khóa học', to: '/courses' },
  { label: 'Tin tức', to: '/news' },
];

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const links = user?.role === 'admin'
    ? [...publicLinks, { label: 'Quản trị', to: '/admin' }]
    : publicLinks;
  const isStudent = user?.role === 'student';

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
        <Toolbar
          disableGutters
          sx={{
            minHeight: layoutTokens.headerHeight,
            gap: { xs: 0.5, md: 2 },
            '& > .MuiIconButton-root': { p: { xs: 0.5, sm: 1 } },
          }}
        >
          <Box
            component={Link}
            to="/"
            aria-label="SEONGON Academy - Trang chủ"
            sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, mr: { md: 1 } }}
          >
            <BrandLogo src={logoSeongon} alt="" width={180} />
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
              {isStudent && <NotificationMenu />}
              {isStudent && <IconButton aria-label="Giỏ hàng" onClick={() => navigate('/cart')} color="primary">
                <Badge badgeContent={count} color="primary"><ShoppingCartOutlinedIcon /></Badge>
              </IconButton>}
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
                aria-label={`Tài khoản ${user.name}`}
                sx={{ display: 'inline-flex', minWidth: { xs: 40, sm: 'auto' }, whiteSpace: 'nowrap' }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{user.name}</Box>
              </Button>
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                <MenuItem component={Link} to="/profile" onClick={() => setMenuAnchor(null)}>Hồ sơ</MenuItem>
                {isStudent && <MenuItem component={Link} to="/my-courses" onClick={() => setMenuAnchor(null)}>Khóa học của tôi</MenuItem>}
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
            {isStudent && <Button component={Link} to="/cart" onClick={closeMobile} variant="outlined" aria-label="Giỏ hàng" startIcon={<Badge badgeContent={count} color="primary"><ShoppingCartOutlinedIcon /></Badge>}>Giỏ hàng</Button>}
            {user && <Button onClick={() => { closeMobile(); void handleLogout(); }}>Đăng xuất</Button>}
          </Stack>
        )}
      </Container>
    </AppBar>
  );
}
