import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordPage } from './ForgotPasswordPage';

const requestPasswordReset = vi.hoisted(() => vi.fn());
const verifyPasswordReset = vi.hoisted(() => vi.fn());
const completePasswordReset = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();

  return {
    ...actual,
    api: {
      ...actual.api,
      requestPasswordReset,
      verifyPasswordReset,
      completePasswordReset,
    },
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ForgotPasswordPage', () => {
  it('requests an OTP for the email and advances to verification', async () => {
    requestPasswordReset.mockResolvedValue({ message: 'Nếu email tồn tại, OTP đã được gửi.' });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'student@example.test');
    await user.click(screen.getByRole('button', { name: 'Gửi OTP' }));

    expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'student@example.test' });
    expect(await screen.findByRole('heading', { name: 'Xác nhận OTP' })).toBeInTheDocument();
  });

  it('verifies the six-digit OTP and advances to the new password form', async () => {
    requestPasswordReset.mockResolvedValue({ message: 'Nếu email tồn tại, OTP đã được gửi.' });
    verifyPasswordReset.mockResolvedValue({ reset_token: 'one-time-reset-token' });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'student@example.test');
    await user.click(screen.getByRole('button', { name: 'Gửi OTP' }));
    await user.type(screen.getByLabelText(/Mã OTP/), '123456');
    await user.click(screen.getByRole('button', { name: 'Xác nhận OTP' }));

    expect(verifyPasswordReset).toHaveBeenCalledWith({
      email: 'student@example.test',
      otp: '123456',
    });
    expect(await screen.findByRole('heading', { name: 'Đặt mật khẩu mới' })).toBeInTheDocument();
  });

  it('resets the password with the one-time token and returns to login', async () => {
    requestPasswordReset.mockResolvedValue({ message: 'Nếu email tồn tại, OTP đã được gửi.' });
    verifyPasswordReset.mockResolvedValue({ reset_token: 'one-time-reset-token' });
    completePasswordReset.mockResolvedValue({ message: 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.' });
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'student@example.test');
    await user.click(screen.getByRole('button', { name: 'Gửi OTP' }));
    await user.type(screen.getByLabelText(/Mã OTP/), '123456');
    await user.click(screen.getByRole('button', { name: 'Xác nhận OTP' }));
    await user.type(screen.getByLabelText(/^Mật khẩu mới/), 'NewPass123!');
    await user.type(screen.getByLabelText(/Xác nhận mật khẩu/), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

    expect(completePasswordReset).toHaveBeenCalledWith({
      email: 'student@example.test',
      reset_token: 'one-time-reset-token',
      password: 'NewPass123!',
      password_confirmation: 'NewPass123!',
    });
    expect(await screen.findByText('Current path: /login')).toBeInTheDocument();
  });

  it('enables OTP resend after the server-provided cooldown', async () => {
    vi.useFakeTimers();
    try {
      requestPasswordReset.mockResolvedValue({
        message: 'Nếu email tồn tại, OTP đã được gửi.',
        retry_after_seconds: 30,
      });
      render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

      fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'student@example.test' } });
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Gửi OTP' })));

      const resend = screen.getByRole('button', { name: 'Gửi lại OTP' });
      expect(resend).toBeDisabled();
      act(() => vi.advanceTimersByTime(30_000));
      expect(resend).toBeEnabled();
      await act(async () => fireEvent.click(resend));

      expect(requestPasswordReset).toHaveBeenCalledTimes(2);
    } finally {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });
});

function CurrentPath() {
  return <div>Current path: {useLocation().pathname}</div>;
}
