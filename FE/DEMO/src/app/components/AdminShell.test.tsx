import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AdminShell } from './AdminShell';

const useAuth = vi.hoisted(() => vi.fn());
vi.mock('../contexts/AuthContext', () => ({ useAuth }));

describe('AdminShell', () => {
  it('uses a full-width Admin header and grouped persistent left sidebar', () => {
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
      'Tổng quan', 'Vai trò', 'Học viên', 'Giỏ hàng', 'Mục giỏ hàng', 'Đơn hàng',
      'Danh mục', 'Gán danh mục', 'Khóa học', 'Bài học',
      'Ghi danh', 'Tiến độ học tập',
      'Bài kiểm tra', 'Câu hỏi', 'Đáp án', 'Kết quả bài kiểm tra',
      'Chứng chỉ', 'Đánh giá', 'Tin tức',
    ]);
    expect(within(navigation).getByRole('region', { name: 'Quản lý khóa học' })).toBeInTheDocument();
    expect(within(navigation).getByRole('region', { name: 'Học tập' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('main')).toHaveStyle({ minWidth: 0 });

    fireEvent.click(within(navigation).getByRole('button', { name: 'Học viên' }));
    expect(onChange).toHaveBeenCalledWith('users');
  });
});
