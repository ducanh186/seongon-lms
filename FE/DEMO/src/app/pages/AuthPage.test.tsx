import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { AuthPage } from './AuthPage';

const login = vi.hoisted(() => vi.fn());
const register = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login, register }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AuthPage', () => {
  it('shows a Laravel field error on the matching login input', async () => {
    login.mockRejectedValue(new ApiError('Dữ liệu không hợp lệ.', 422, {
      email: ['Email không đúng định dạng.'],
    }));

    render(<MemoryRouter><AuthPage /></MemoryRouter>);
    expect(screen.getByRole('complementary', { name: 'Giới thiệu nền tảng học tập' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Đăng nhập hoặc đăng ký' })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'student@example.test');
    await user.type(screen.getByLabelText(/Mật khẩu/), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Email không đúng định dạng.')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('student@example.test', 'SecurePass123!');
  });

  it('returns a guest to the cart after successful login', async () => {
    login.mockResolvedValue({ id: 1, role: 'student' });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/cart' } }]}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/cart" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'student@seongon.vn');
    await user.type(screen.getByLabelText(/Mật khẩu/), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Current path: /cart')).toBeInTheDocument();
  });

  it('uses Marketing-success copy and a fixed two-column desktop layout', () => {
    render(<MemoryRouter><AuthPage /></MemoryRouter>);

    expect(screen.queryByText(/TÀI KHOẢN HỌC TẬP/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trong một tài khoản duy nhất/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Học Marketing thực chiến/i })).toBeInTheDocument();
    expect(screen.getByTestId('auth-layout')).toHaveStyle({ gridTemplateColumns: '.9fr 1fr' });
  });

  it('always routes an admin to Admin Portal even with stale student return state', async () => {
    login.mockResolvedValue({ id: 2, role: 'admin' });
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/cart' } }]}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/admin" element={<CurrentPath />} />
          <Route path="/cart" element={<div>Wrong student route</div>} />
        </Routes>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'admin@seongon.vn');
    await user.type(screen.getByLabelText(/Mật khẩu/), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Current path: /admin')).toBeInTheDocument();
    expect(screen.queryByText('Wrong student route')).not.toBeInTheDocument();
  });
});

function CurrentPath() {
  return <div>Current path: {useLocation().pathname}</div>;
}
