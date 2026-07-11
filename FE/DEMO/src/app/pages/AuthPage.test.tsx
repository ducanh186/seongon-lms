import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { AuthPage } from './AuthPage';

const login = vi.hoisted(() => vi.fn());
const register = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login, register }),
}));

describe('AuthPage', () => {
  it('shows a Laravel field error on the matching login input', async () => {
    login.mockRejectedValue(new ApiError('Dữ liệu không hợp lệ.', 422, {
      email: ['Email không đúng định dạng.'],
    }));

    render(<MemoryRouter><AuthPage /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'student@example.test');
    await user.type(screen.getByLabelText(/Mật khẩu/), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Email không đúng định dạng.')).toBeInTheDocument();
  });
});
