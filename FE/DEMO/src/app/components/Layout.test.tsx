import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../theme';
import { Layout } from './Layout';

const useAuth = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({ useAuth }));

afterEach(cleanup);

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
  useAuth.mockReturnValue({
    user: role ? { id: 1, name: role === 'admin' ? 'SEONGON Admin' : 'Học viên', email: `${role}@seongon.vn`, role, avatar: null } : null,
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<div>Nội dung</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  it('uses a 3:1 opaque focus outline against shared light surfaces', () => {
    const buttonStyles = theme.components?.MuiButtonBase?.styleOverrides?.root as {
      '&.Mui-focusVisible'?: { outline?: string };
    };
    const outline = buttonStyles['&.Mui-focusVisible']?.outline ?? '';

    expect(outline).toMatch(/^3px solid #[\da-f]{6}$/i);
    const focusColor = outline.split(' ').at(-1) ?? '';
    expect(contrastRatio(focusColor, '#FFFFFF')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(focusColor, '#F2F6F8')).toBeGreaterThanOrEqual(3);
  });

  it('exposes reference-led discovery actions and role links', () => {
    renderLayout('/courses', 'admin');

    expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khóa học' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Quản trị' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tìm kiếm khóa học' })).toBeInTheDocument();
  });

  it('exposes the mobile navigation state accessibly', async () => {
    renderLayout();
    const user = userEvent.setup();
    const menuButton = screen.getByRole('button', { name: 'Mở menu' });

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('link', { name: 'Khóa học' })).toHaveLength(2);
  });

  it('marks the active route and keeps admin navigation role-based', () => {
    renderLayout('/courses', 'admin');

    expect(screen.getAllByRole('link', { name: 'Khóa học' })[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Quản trị' })).toBeInTheDocument();
  });

  it('does not expose admin navigation to students', () => {
    renderLayout('/courses', 'student');

    expect(screen.queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument();
  });

  it('preserves the authenticated account menu', async () => {
    renderLayout('/courses', 'admin');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /SEONGON Admin/ }));

    expect(screen.getByRole('menuitem', { name: 'Hồ sơ' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Khóa học của tôi' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Quản trị' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
  });
});
