import { Alert, Button, Skeleton, Stack } from '@mui/material';
import type { ReactNode } from 'react';

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={2} aria-label="Đang tải nội dung">
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} variant="rounded" height={index === 0 ? 160 : 72} />)}
    </Stack>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return <Alert severity="info" action={action}>{title}</Alert>;
}

export function RequestError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Thử lại</Button> : undefined}>
      {message}
    </Alert>
  );
}
