import { Badge, IconButton, ListItemText, Menu, MenuItem } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { useId } from 'react';
import { useAdminNotifications } from '../contexts/AdminNotificationContext';
import { useHeaderHoverMenu } from './useHeaderHoverMenu';

export function NotificationMenu({ role }: { role: 'admin' | 'student' }) {
  const hoverMenu = useHeaderHoverMenu();
  const { notifications, clearNotifications } = useAdminNotifications();
  const triggerId = useId();
  const menuId = useId();

  return (
    <>
      <IconButton
        id={triggerId}
        aria-label="Thông báo"
        aria-controls={menuId}
        aria-haspopup="menu"
        aria-expanded={Boolean(hoverMenu.anchor)}
        color="primary"
        onMouseEnter={hoverMenu.open}
        onMouseLeave={hoverMenu.closeAfterDelay}
        onClick={hoverMenu.open}
      >
        <Badge color="error" badgeContent={notifications.length} invisible={role !== 'admin' || notifications.length === 0}>
          <NotificationsNoneRoundedIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={hoverMenu.anchor}
        open={Boolean(hoverMenu.anchor)}
        onClose={hoverMenu.close}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        disableScrollLock
        transitionDuration={0}
        slotProps={{
          root: { sx: { pointerEvents: 'none' } },
          list: { id: menuId, 'aria-labelledby': triggerId },
          paper: {
            onMouseEnter: hoverMenu.cancelClose,
            onMouseLeave: hoverMenu.closeAfterDelay,
            sx: { pointerEvents: 'auto' },
          },
        }}
      >
        {role === 'student' && <MenuItem disabled>Bạn chưa có thông báo mới.</MenuItem>}
        {role === 'admin' && notifications.length === 0 && <MenuItem disabled>Chưa có thông báo quản trị mới.</MenuItem>}
        {role === 'admin' && notifications.map((notification) => (
          <MenuItem key={notification.id} sx={{ minWidth: 280, whiteSpace: 'normal' }}>
            <ListItemText primary={notification.message} secondary={notification.createdAt} />
          </MenuItem>
        ))}
        {role === 'admin' && notifications.length > 0 && (
          <MenuItem onClick={() => { clearNotifications(); hoverMenu.close(); }}>Xóa tất cả thông báo</MenuItem>
        )}
      </Menu>
    </>
  );
}
