import { Box, Button, CircularProgress, Link, Stack, Typography, useMediaQuery } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import type { ApiCategory } from '../lib/contracts';
import { api } from '../lib/api';

export const OPEN_MS = 200;
export const CLOSE_DELAY_MS = 200;

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function CourseMegaMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requested = useRef(false);
  const triggerRef = useRef<HTMLAnchorElement | null>(null);
  const restoringFocus = useRef(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', { noSsr: true });

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const loadCategories = () => {
    if (requested.current) return;
    requested.current = true;
    setLoadState('loading');
    void api.categories()
      .then(({ data }) => {
        setCategories(data);
        setLoadState('success');
      })
      .catch(() => setLoadState('error'));
  };

  const show = () => {
    cancelClose();
    setOpen(true);
    loadCategories();
  };

  const hideAfterDelay = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const closeWithFocusRestore = () => {
    cancelClose();
    setOpen(false);
    restoringFocus.current = true;
    triggerRef.current?.focus();
  };

  useEffect(() => {
    loadCategories();
    return () => cancelClose();
  }, []);

  return (
    <Box
      sx={{ position: 'relative', alignSelf: 'stretch', display: 'flex', alignItems: 'stretch' }}
      onMouseEnter={show}
      onMouseLeave={hideAfterDelay}
      onFocusCapture={() => {
        if (restoringFocus.current) {
          restoringFocus.current = false;
          return;
        }
        show();
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hideAfterDelay();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          closeWithFocusRestore();
        }
      }}
    >
      <Button
        ref={triggerRef}
        component={RouterLink}
        to="/courses"
        color="inherit"
        aria-current={active ? 'page' : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="course-mega-menu"
        sx={{
          minWidth: 0,
          px: 1.5,
          borderRadius: 0,
          borderBottom: '2px solid',
          borderColor: active ? 'primary.main' : 'transparent',
          color: active ? 'primary.dark' : 'text.primary',
          '&:hover': { bgcolor: 'transparent', color: 'primary.dark' },
        }}
      >
        Khóa học
      </Button>

      {open && (
        <Box
          id="course-mega-menu"
          component="nav"
          aria-label="Danh mục khóa học"
          style={{ transitionDuration: reducedMotion ? '0ms' : `${OPEN_MS}ms` }}
          sx={{
            position: 'fixed',
            zIndex: 1300,
            top: 64,
            left: 0,
            right: 0,
            width: '100%',
            px: 'max(24px, calc((100vw - 1232px) / 2))',
            py: 3,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0,
            boxShadow: '0 18px 44px rgba(16,42,67,.16)',
            animation: reducedMotion ? 'none' : `courseMegaMenuIn ${OPEN_MS}ms ease both`,
            '@keyframes courseMegaMenuIn': {
              from: { opacity: 0, transform: 'translateY(-8px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <Typography variant="overline" color="primary.dark" fontWeight={800}>Khám phá theo chủ đề</Typography>
          <Link component={RouterLink} to="/courses" onClick={() => setOpen(false)} underline="none" sx={{ display: 'block', width: 'fit-content', mt: 1, color: 'primary.dark', fontWeight: 800 }}>
            Tất cả khóa học
          </Link>
          {loadState === 'loading' && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={20} /><Typography color="text.secondary">Đang tải danh mục...</Typography>
            </Stack>
          )}
          {loadState === 'error' && <Typography color="error" sx={{ py: 3 }}>Không thể tải danh mục khóa học.</Typography>}
          {loadState === 'success' && categories.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 3 }}>Chưa có danh mục khóa học.</Typography>
          )}
          {loadState === 'success' && categories.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mt: 1.5 }}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  component={RouterLink}
                  to={`/courses?category=${encodeURIComponent(category.slug)}`}
                  onClick={() => setOpen(false)}
                  underline="none"
                  sx={{ display: 'block', p: 1.5, borderRadius: 1, color: 'text.primary', '&:hover': { bgcolor: 'primary.light' } }}
                >
                  <Typography fontWeight={700}>{category.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {category.courses_count ?? 0} khóa học{category.description ? ` · ${category.description}` : ''}
                  </Typography>
                </Link>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
