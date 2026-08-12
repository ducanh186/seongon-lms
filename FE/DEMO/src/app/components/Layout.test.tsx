import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { layoutTokens, theme } from '../theme';
import { Layout } from './Layout';

const useAuth = vi.hoisted(() => vi.fn());
const useCart = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../cart/CartContext', () => ({ useCart }));

afterEach(cleanup);

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>;
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex.match(/[\da-f]{2}/gi)?.map((value) => parseInt(value, 16) / 255) ?? [];
    const [red = 0, green = 0, blue = 0] = channels.map((value) => (
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    ));

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };

  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function renderLayout(path = '/', role: 'student' | 'admin' | null = null) {
  const logout = vi.fn();
  useAuth.mockReturnValue({
    user: role ? { id: 1, name: role === 'admin' ? 'SEONGON Admin' : 'Học viên', email: `${role}@seongon.vn`, role, avatar: null } : null,
    logout,
  });
  useCart.mockReturnValue({ count: role === 'student' ? 2 : 0 });

  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<div>Nội dung<CurrentPath /></div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  return { ...view, logout };
}

describe('Layout', () => {
  it('gives the SEONGON brand the approved header prominence', () => {
    renderLayout();

    const brandLink = screen.getByRole('link', { name: 'SEONGON Academy - Trang chủ' });
    const logo = brandLink.querySelector('img');

    expect(logo).toHaveAttribute('width', '180');
    expect(window.getComputedStyle(brandLink).flexShrink).toBe('0');
    expect(layoutTokens.headerHeight).toBe(80);
  });

  it('uses 3:1 focus outlines across shared light and dark surfaces', () => {
    const buttonStyles = theme.components?.MuiButtonBase?.styleOverrides?.root as {
      '&.Mui-focusVisible'?: { outline?: string };
      '[data-surface="dark"] &.Mui-focusVisible'?: { outlineColor?: string };
    };
    const outline = buttonStyles['&.Mui-focusVisible']?.outline ?? '';

    expect(outline).toMatch(/^3px solid #[\da-f]{6}$/i);
    const focusColor = outline.split(' ').at(-1) ?? '';
    expect(contrastRatio(focusColor, '#FFFFFF')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(focusColor, '#F2F6F8')).toBeGreaterThanOrEqual(3);

    const darkSurfaceFocusColor = buttonStyles['[data-surface="dark"] &.Mui-focusVisible']?.outlineColor ?? '';
    expect(darkSurfaceFocusColor).toMatch(/^#[\da-f]{6}$/i);
    expect(contrastRatio(darkSurfaceFocusColor, '#102E38')).toBeGreaterThanOrEqual(3);

    renderLayout();
    expect(screen.getByRole('contentinfo')).toHaveAttribute('data-surface', 'dark');
  });

  it('shows only public navigation, search, and login to guests', () => {
    renderLayout('/courses');
    const desktopNavigation = screen.getByRole('navigation', { name: 'Điều hướng chính' });

    expect(within(desktopNavigation).getByRole('link', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(within(desktopNavigation).getByRole('link', { name: 'Khóa học' })).toHaveAttribute('aria-current', 'page');
    expect(within(desktopNavigation).getByRole('link', { name: 'Tin tức' })).toHaveAttribute('href', '/news');
    expect(within(desktopNavigation).queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tìm kiếm khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thông báo' })).not.toBeInTheDocument();
  });

  it('gives students notifications and a student-only account menu without a standalone my-courses link', async () => {
    renderLayout('/courses', 'student');
    const user = userEvent.setup();
    const desktopNavigation = screen.getByRole('navigation', { name: 'Điều hướng chính' });

    expect(within(desktopNavigation).queryByRole('link', { name: 'Khóa học của tôi' })).not.toBeInTheDocument();
    expect(within(desktopNavigation).queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument();

    const notificationButton = screen.getByRole('button', { name: 'Thông báo' });
    expect(notificationButton).toHaveAttribute('aria-expanded', 'false');
    expect(notificationButton).toHaveAttribute('aria-controls');
    expect(screen.getByRole('button', { name: 'Giỏ hàng' })).toBeInTheDocument();

    await user.click(notificationButton);
    expect(notificationButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Thông báo' })).toHaveAttribute(
      'aria-labelledby',
      notificationButton.getAttribute('id'),
    );
    expect(screen.getByText('Bạn chưa có thông báo mới.')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /Học viên/ }));
    expect(screen.getByRole('menuitem', { name: 'Hồ sơ' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Khóa học của tôi' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Quản trị' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('gives admins their admin navigation and no student controls', async () => {
    renderLayout('/courses', 'admin');
    const user = userEvent.setup();
    const desktopNavigation = screen.getByRole('navigation', { name: 'Điều hướng chính' });

    expect(within(desktopNavigation).getByRole('link', { name: 'Tin tức' })).toHaveAttribute('href', '/news');
    expect(within(desktopNavigation).getByRole('link', { name: 'Quản trị' })).toBeInTheDocument();
    expect(within(desktopNavigation).queryByRole('link', { name: 'Khóa học của tôi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thông báo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Giỏ hàng' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /SEONGON Admin/ }));
    expect(screen.getByRole('menuitem', { name: 'Hồ sơ' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Khóa học của tôi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Quản trị' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it.each([
    ['guest', null, false, false],
    ['student', 'student', false, true],
    ['admin', 'admin', true, false],
  ] as const)('applies the role navigation rules to mobile for %s', async (_roleName, role, seesAdmin, seesCart) => {
    renderLayout('/', role);
    const user = userEvent.setup();
    const menuButton = screen.getByRole('button', { name: 'Mở menu' });

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(menuButton);

    const mobileNavigation = screen.getByRole('navigation', { name: 'Điều hướng di động' });
    expect(within(mobileNavigation).getByRole('link', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('link', { name: 'Khóa học' })).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('link', { name: 'Tin tức' })).toHaveAttribute('href', '/news');
    expect(within(mobileNavigation).queryByRole('link', { name: 'Khóa học của tôi' })).not.toBeInTheDocument();

    if (seesCart) {
      expect(within(mobileNavigation).getByRole('link', { name: 'Giỏ hàng' })).toHaveAttribute('href', '/cart');
      expect(within(mobileNavigation).getByText('2')).toBeInTheDocument();
    } else {
      expect(within(mobileNavigation).queryByRole('link', { name: 'Giỏ hàng' })).not.toBeInTheDocument();
    }

    if (seesAdmin) {
      expect(within(mobileNavigation).getByRole('link', { name: 'Quản trị' })).toBeInTheDocument();
    } else {
      expect(within(mobileNavigation).queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument();
    }
  });

  it('keeps My Courses inside the student avatar menu on mobile', async () => {
    renderLayout('/', 'student');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Học viên/ }));

    expect(screen.getByRole('menuitem', { name: 'Khóa học của tôi' })).toHaveAttribute('href', '/my-courses');
  });

  it('lets authenticated users log out from the mobile navigation', async () => {
    const { logout } = renderLayout('/courses', 'student');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Mở menu' }));
    const mobileNavigation = screen.getByRole('navigation', { name: 'Điều hướng di động' });
    await user.click(within(mobileNavigation).getByRole('button', { name: 'Đăng xuất' }));

    expect(logout).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/'));
  });
});
