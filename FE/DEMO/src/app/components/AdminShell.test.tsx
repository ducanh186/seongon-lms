import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminShell } from './AdminShell';

const useAuth = vi.hoisted(() => vi.fn());
vi.mock('../contexts/AuthContext', () => ({ useAuth }));

function mockViewport(compact: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: compact,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('AdminShell', () => {
  beforeEach(() => mockViewport(false));
  afterEach(cleanup);

  it('uses a full-width Admin header and collapsible flat left sidebar', () => {
    const onChange = vi.fn();
    const logout = vi.fn();
    useAuth.mockReturnValue({ user: { name: 'SEONGON Admin', role: 'admin' }, logout });

    render(<MemoryRouter><AdminShell active="courses" onChange={onChange}><p>Nội dung quản trị</p></AdminShell></MemoryRouter>);

    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    expect(sidebar).toHaveStyle({ position: 'sticky', top: '0px', height: 'calc(100dvh - 72px)', maxHeight: 'calc(100dvh - 72px)' });
    expect(sidebar.parentElement?.parentElement).toHaveStyle({ overflowX: 'clip' });
    const banner = screen.getByRole('banner', { name: 'Admin Portal' });
    expect(within(banner).getByText('SEONGON ACADEMY')).toBeInTheDocument();
    expect(within(banner).getByText('Admin Portal')).toBeInTheDocument();
    expect(within(banner).getByText('SEONGON Admin')).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: 'Xem site public' })).toHaveAttribute('href', '/');
    fireEvent.click(within(banner).getByRole('button', { name: 'Đăng xuất' }));
    expect(logout).toHaveBeenCalledOnce();

    const navigation = screen.getByRole('navigation', { name: 'Quản trị' });
    expect(navigation).toHaveAttribute('data-admin-sidebar', 'true');
    expect(navigation).toHaveStyle({ maxHeight: 'calc(100dvh - 124px)', overflowY: 'auto' });
    expect(within(navigation).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Tổng quan', 'Tài khoản', 'Đơn hàng',
      'Danh mục', 'Khóa học', 'Tin tức',
    ]);
    expect(within(navigation).queryByText('Quản lý khóa học')).not.toBeInTheDocument();
    expect(within(navigation).queryByText('Học tập')).not.toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'true');
    const main = screen.getByRole('main');
    expect(main).toHaveStyle({ minWidth: 0 });
    expect(main.parentElement).toHaveStyle({ width: '100%', maxWidth: 'none', gridTemplateColumns: '230px minmax(0, 1fr)' });

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh bên' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    expect(main.parentElement).toHaveStyle({ gridTemplateColumns: '76px minmax(0, 1fr)' });
    expect(screen.getByRole('button', { name: 'Mở rộng thanh bên' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng thanh bên' }));
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');

    fireEvent.click(within(navigation).getByRole('button', { name: 'Tài khoản' }));
    expect(onChange).toHaveBeenCalledWith('users');
  });

  it('automatically starts with the sidebar collapsed on a compact viewport', () => {
    mockViewport(true);
    useAuth.mockReturnValue({ user: { name: 'SEONGON Admin', role: 'admin' }, logout: vi.fn() });

    render(<MemoryRouter><AdminShell active="overview" onChange={vi.fn()}><p>Nội dung quản trị</p></AdminShell></MemoryRouter>);

    expect(screen.getByRole('complementary')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByRole('button', { name: 'Mở rộng thanh bên' })).toBeInTheDocument();
  });
});
