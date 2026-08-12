import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AdminShell } from './AdminShell';

const useAuth = vi.hoisted(() => vi.fn());
vi.mock('../contexts/AuthContext', () => ({ useAuth }));

describe('AdminShell', () => {
  it('uses a full-width Admin header and ordered horizontal navigation without a sidebar', () => {
    const onChange = vi.fn();
    useAuth.mockReturnValue({ user: { name: 'SEONGON Admin', role: 'admin' }, logout: vi.fn() });

    render(<MemoryRouter><AdminShell active="courses" onChange={onChange}><p>Nội dung quản trị</p></AdminShell></MemoryRouter>);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    const banner = screen.getByRole('banner', { name: 'Admin Portal' });
    expect(within(banner).getByText('SEONGON ACADEMY')).toBeInTheDocument();
    expect(within(banner).getByText('Admin Portal')).toBeInTheDocument();
    expect(within(banner).getByText('SEONGON Admin')).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: 'Xem site public' })).toHaveAttribute('href', '/');

    const navigation = screen.getByRole('navigation', { name: 'Quản trị' });
    expect(within(navigation).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Tổng quan', 'Học viên', 'Danh mục', 'Khóa học', 'Đánh giá', 'Tin tức',
    ]);
    expect(within(navigation).getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'true');
    expect(navigation).toHaveStyle({ overflowX: 'auto' });
    expect(screen.getByRole('main')).toHaveStyle({ overflowX: 'hidden' });

    fireEvent.click(within(navigation).getByRole('button', { name: 'Học viên' }));
    expect(onChange).toHaveBeenCalledWith('users');
  });
});
