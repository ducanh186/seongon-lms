import { IconButton, Menu, MenuItem } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { useId } from 'react';
import { useHeaderHoverMenu } from './useHeaderHoverMenu';

export function NotificationMenu() {
  const hoverMenu = useHeaderHoverMenu();
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
        <NotificationsNoneRoundedIcon />
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
        <MenuItem disabled>Bạn chưa có thông báo mới.</MenuItem>
      </Menu>
    </>
  );
}
