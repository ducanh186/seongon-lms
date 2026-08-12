import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
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
import { styled } from '@mui/material/styles';
import { useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import logoSeongon from 'figma:asset/dd45f331e8a4458443255a6f01a8333b19d6c86a.png';
import { useCart } from '../cart/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { layoutTokens } from '../theme';
import { CourseMegaMenu } from './CourseMegaMenu';
import { NotificationMenu } from './NotificationMenu';
import { useHeaderHoverMenu } from './useHeaderHoverMenu';

const BrandLogo = styled('img')({ display: 'block', width: 'auto', height: 48 });

export function GlobalHeader() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const accountMenu = useHeaderHoverMenu();
  const accountTriggerId = useId();
  const accountMenuId = useId();
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';
  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  const handleLogout = async () => {
    await logout();
    accountMenu.close();
    navigate('/');
  };

  const navLink = ({ label, to }: { label: string; to: string }) => (
    <Button
      key={to}
      component={Link}
      to={to}
      aria-current={isActive(to) ? 'page' : undefined}
      color="inherit"
      sx={{
        minWidth: 0,
        px: 1.5,
        borderRadius: 0,
        borderBottom: '2px solid',
        borderColor: isActive(to) ? 'primary.main' : 'transparent',
        color: isActive(to) ? 'primary.dark' : 'text.primary',
        '&:hover': { bgcolor: 'transparent', color: 'primary.dark' },
      }}
    >
      {label}
    </Button>
  );

  return (
    <AppBar component="header" position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Container maxWidth={false} sx={{ maxWidth: layoutTokens.contentMaxWidth, px: 3 }}>
        <Toolbar disableGutters sx={{ minHeight: layoutTokens.headerHeight, gap: 2 }}>
          <Box component={Link} to="/" aria-label="SEONGON Academy - Trang chủ" sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, mr: 1 }}>
            <BrandLogo src={logoSeongon} alt="" width={180} />
          </Box>

          <Stack component="nav" aria-label="Điều hướng chính" direction="row" spacing={0.5} sx={{ alignSelf: 'stretch', alignItems: 'stretch' }}>
            {navLink({ label: 'Trang chủ', to: '/' })}
            <CourseMegaMenu active={isActive('/courses')} />
            {navLink({ label: 'Tin tức', to: '/news' })}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />
          <IconButton aria-label="Tìm kiếm khóa học" onClick={() => navigate('/courses')} color="primary">
            <SearchRoundedIcon />
          </IconButton>

          {!user && (
            <>
              <IconButton component={Link} to="/cart" aria-label="Giỏ hàng" color="primary">
                <ShoppingCartOutlinedIcon />
              </IconButton>
              <Button component={Link} to="/login" color="primary">Đăng nhập</Button>
              <Button component={Link} to="/login" variant="contained">Đăng ký</Button>
            </>
          )}

          {user && (
            <>
              {isStudent && <NotificationMenu />}
              {isStudent && (
                <IconButton aria-label="Giỏ hàng" onClick={() => navigate('/cart')} color="primary">
                  <Badge badgeContent={count} color="primary"><ShoppingCartOutlinedIcon /></Badge>
                </IconButton>
              )}
              <Button
                id={accountTriggerId}
                onMouseEnter={accountMenu.open}
                onMouseLeave={accountMenu.closeAfterDelay}
                onFocus={accountMenu.open}
                onBlur={accountMenu.closeAfterDelay}
                startIcon={<Avatar src={user.avatar ?? undefined} sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>{user.name[0]}</Avatar>}
                color="primary"
                aria-haspopup="menu"
                aria-controls={accountMenuId}
                aria-expanded={Boolean(accountMenu.anchor)}
                aria-label={`Tài khoản ${user.name}`}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {user.name}
              </Button>
              <Menu
                anchorEl={accountMenu.anchor}
                open={Boolean(accountMenu.anchor)}
                onClose={accountMenu.close}
                transitionDuration={{ enter: 200, exit: 150 }}
                slotProps={{
                  root: { sx: { pointerEvents: 'none' } },
                  list: { id: accountMenuId, 'aria-labelledby': accountTriggerId },
                  paper: {
                    onMouseEnter: accountMenu.cancelClose,
                    onMouseLeave: accountMenu.closeAfterDelay,
                    sx: {
                      pointerEvents: 'auto',
                      animation: 'headerDropdownIn 200ms ease both',
                      '@keyframes headerDropdownIn': {
                        from: { opacity: 0, transform: 'translateY(-8px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    },
                  },
                }}
              >
                <MenuItem component={Link} to="/profile" onClick={accountMenu.close}>Hồ sơ</MenuItem>
                {isStudent && <MenuItem component={Link} to="/my-courses" onClick={accountMenu.close}>Khóa học của tôi</MenuItem>}
                {isAdmin && <MenuItem component={Link} to="/admin" onClick={accountMenu.close}>Admin Portal</MenuItem>}
                <Divider />
                <MenuItem onClick={() => void handleLogout()}>Đăng xuất</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
