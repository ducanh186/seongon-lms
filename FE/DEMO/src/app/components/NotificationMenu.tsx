import { IconButton, Menu, MenuItem } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { useId, useState } from 'react';

export function NotificationMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const triggerId = useId();
  const menuId = useId();

  return (
    <>
      <IconButton
        id={triggerId}
        aria-label="Thông báo"
        aria-controls={menuId}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        color="primary"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <NotificationsNoneRoundedIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { id: menuId, 'aria-labelledby': triggerId } }}
      >
        <MenuItem disabled>Bạn chưa có thông báo mới.</MenuItem>
      </Menu>
    </>
  );
}
