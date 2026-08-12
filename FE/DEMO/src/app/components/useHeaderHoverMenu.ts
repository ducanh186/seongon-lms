import { useEffect, useRef, useState } from 'react';

export const HEADER_MENU_CLOSE_DELAY_MS = 200;

export function useHeaderHoverMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const open = (event: { currentTarget: HTMLElement }) => {
    cancelClose();
    setAnchor(event.currentTarget);
  };

  const close = () => {
    cancelClose();
    setAnchor(null);
  };

  const closeAfterDelay = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setAnchor(null);
    }, HEADER_MENU_CLOSE_DELAY_MS);
  };

  useEffect(() => () => cancelClose(), []);

  return { anchor, open, close, closeAfterDelay, cancelClose };
}
