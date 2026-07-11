import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, PageSkeleton, RequestError } from './AsyncState';

describe('AsyncState', () => {
  it('renders accessible loading, empty, and retry states', () => {
    const onRetry = vi.fn();
    render(<><PageSkeleton /><EmptyState title="Chưa có khóa học" /><RequestError message="Không thể tải dữ liệu" onRetry={onRetry} /></>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
    expect(screen.getByText('Chưa có khóa học')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Thử lại' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
