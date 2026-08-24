import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AdminShell } from './AdminShell';

const useAuth = vi.hoisted(() => vi.fn());
vi.mock('../contexts/AuthContext', () => ({ useAuth }));

describe('AdminShell', () => {
  it('uses a full-width Admin header and flat persistent left sidebar', () => {
    const onChange = vi.fn();
    const logout = vi.fn();
    useAuth.mockReturnValue({ user: { name: 'SEONGON Admin', role: 'admin' }, logout });

    render(<MemoryRouter><AdminShell active="courses" onChange={onChange}><p>Nội dung quản trị</p></AdminShell></MemoryRouter>);

    expect(screen.getByRole('complementary')).toBeInTheDocument();
    const banner = screen.getByRole('banner', { name: 'Admin Portal' });
    expect(within(banner).getByText('SEONGON ACADEMY')).toBeInTheDocument();
    expect(within(banner).getByText('Admin Portal')).toBeInTheDocument();
    expect(within(banner).getByText('SEONGON Admin')).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: 'Xem site public' })).toHaveAttribute('href', '/');
    fireEvent.click(within(banner).getByRole('button', { name: 'Đăng xuất' }));
    expect(logout).toHaveBeenCalledOnce();

    const navigation = screen.getByRole('navigation', { name: 'Quản trị' });
    expect(navigation).toHaveAttribute('data-admin-sidebar', 'true');
    expect(within(navigation).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Tổng quan', 'Tài khoản', 'Đơn hàng',
      'Danh mục', 'Khóa học', 'Tin tức',
    ]);
    expect(within(navigation).queryByText('Quản lý khóa học')).not.toBeInTheDocument();
    expect(within(navigation).queryByText('Học tập')).not.toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('main')).toHaveStyle({ minWidth: 0 });

    fireEvent.click(within(navigation).getByRole('button', { name: 'Tài khoản' }));
    expect(onChange).toHaveBeenCalledWith('users');
  });
});
