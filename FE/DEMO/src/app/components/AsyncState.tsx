import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={2} aria-label="Đang tải nội dung" role="status" aria-live="polite" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} variant="rounded" height={index === 0 ? 160 : 72} sx={{ borderRadius: '10px' }} />)}
    </Stack>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return <Box role="status" sx={{ p: 3, border: '1px dashed', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper', textAlign: 'center' }}><Typography color="text.secondary">{title}</Typography>{action && <Box sx={{ mt: 2 }}>{action}</Box>}</Box>;
}

export function RequestError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert severity="error" role="alert" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Thử lại</Button> : undefined}>
      {message}
    </Alert>
  );
}
