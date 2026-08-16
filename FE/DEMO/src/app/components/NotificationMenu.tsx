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
        onFocus={hoverMenu.open}
        onBlur={hoverMenu.closeAfterDelay}
      >
        <NotificationsNoneRoundedIcon />
      </IconButton>
      <Menu
        anchorEl={hoverMenu.anchor}
        open={Boolean(hoverMenu.anchor)}
        onClose={hoverMenu.close}
        disableScrollLock
        transitionDuration={{ enter: 200, exit: 150 }}
        slotProps={{
          root: { sx: { pointerEvents: 'none' } },
          list: { id: menuId, 'aria-labelledby': triggerId },
          paper: {
            onMouseEnter: hoverMenu.cancelClose,
            onMouseLeave: hoverMenu.closeAfterDelay,
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
        <MenuItem disabled>Bạn chưa có thông báo mới.</MenuItem>
      </Menu>
    </>
  );
}
