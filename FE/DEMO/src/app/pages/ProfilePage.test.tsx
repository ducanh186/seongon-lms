import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { ProfilePage } from './ProfilePage';

const updateProfile = vi.hoisted(() => vi.fn());
const updatePassword = vi.hoisted(() => vi.fn());
const refreshUser = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { updateProfile, updatePassword },
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'student-token',
    user: { id: 1, name: 'Hoc vien', email: 'student@example.test', role: 'student', phone: null, avatar: null, status: 'active', created_at: '2026-07-10T00:00:00Z' },
    refreshUser,
  }),
}));

describe('ProfilePage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('refreshes the authenticated user after saving profile changes', async () => {
    updateProfile.mockResolvedValue({ data: { id: 1, name: 'Hoc vien moi' } });
    render(<ProfilePage />);

    const nameInput = screen.getByLabelText(/Họ và tên/);
    fireEvent.change(nameInput, { target: { value: 'Hoc vien moi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

    expect(await screen.findByText('Đã cập nhật hồ sơ.')).toBeInTheDocument();
    expect(refreshUser).toHaveBeenCalledOnce();
  });

  it('shows Laravel password validation beside the affected field', async () => {
    updatePassword.mockRejectedValue(new ApiError('Dữ liệu không hợp lệ.', 422, {
      current_password: ['Mật khẩu hiện tại không đúng.'],
    }));
    render(<ProfilePage />);

    fireEvent.change(screen.getByLabelText(/Mật khẩu hiện tại/), { target: { value: 'WrongPass123!' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu mới/), { target: { value: 'NewPass123!' } });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/), { target: { value: 'NewPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));

    expect(await screen.findByText('Mật khẩu hiện tại không đúng.')).toBeInTheDocument();
  });

  it('groups account, learning summary, and security information', () => {
    render(<ProfilePage />);

    expect(screen.getByRole('region', { name: 'Thông tin tài khoản' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tổng quan học tập' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Bảo mật tài khoản' })).toBeInTheDocument();
  });
});
