import type { ReactNode } from 'react';
import { Alert, Stack } from '@mui/material';
import { AdminSectionHeader } from './AdminSectionHeader';
import { EmptyState, PageSkeleton, RequestError } from './AsyncState';

type AdminEntityPageStatus = 'ready' | 'loading' | 'error' | 'empty' | 'placeholder';

interface AdminEntityPageProps {
  title: string;
  description?: string;
  status: AdminEntityPageStatus;
  errorMessage?: string;
  emptyMessage?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  pagination?: ReactNode;
  onRetry?: () => void;
  children?: ReactNode;
}

export function AdminEntityPage({
  title,
  description = '',
  status,
  errorMessage = 'Không thể tải dữ liệu.',
  emptyMessage = 'Chưa có dữ liệu.',
  filters,
  actions,
  pagination,
  onRetry,
  children,
}: AdminEntityPageProps) {
  return (
    <Stack spacing={2.5}>
      <AdminSectionHeader title={title} description={description} action={actions} />
      {filters}
      {status === 'loading' && <PageSkeleton />}
      {status === 'error' && <RequestError message={errorMessage} onRetry={onRetry} />}
      {status === 'empty' && <EmptyState title={emptyMessage} />}
      {status === 'placeholder' && (
        <Alert severity="info" variant="outlined">
          <strong>Chức năng đang chờ đối chiếu ERD chính thức.</strong>
          <br />
          Dữ liệu hiện tại chỉ phục vụ prototype.
        </Alert>
      )}
      {status === 'ready' && children}
      {status === 'ready' && pagination}
    </Stack>
  );
}
