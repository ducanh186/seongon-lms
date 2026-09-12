import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

function SessionProbe() {
  const { user, login, register, refreshUser } = useAuth();

  return (
    <>
      <span>{user?.name ?? 'guest'}</span>
      <button onClick={() => void login('student@example.test', 'SecurePass123!')}>login</button>
      <button onClick={() => void register('N', 'n@example.test', 'SecurePass123', 'SecurePass123')}>register</button>
      <button onClick={() => void refreshUser()}>refresh</button>
    </>
  );
}

describe('AuthContext', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('persists the token and user returned by a successful login', async () => {
    vi.mocked(api.login).mockResolvedValue({
      token: 'sanctum-token',
      user: {
        id: 1,
        name: 'Hoc vien Demo',
        email: 'student@example.test',
        role: 'student',
        phone: null,
        avatar: null,
        status: 'active',
        created_at: '2026-07-10T00:00:00Z',
      },
    });

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await screen.getByRole('button', { name: 'login' }).click();
    });

    expect(screen.getByText('Hoc vien Demo')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('seongon.session') ?? '{}')).toEqual({ token: 'sanctum-token' });
  });

  it('refreshes the current user from the Sanctum profile endpoint', async () => {
    vi.mocked(api.login).mockResolvedValue({
      token: 'sanctum-token',
      user: {
        id: 1, name: 'Hoc vien Demo', email: 'student@example.test', role: 'student', phone: null, avatar: null, status: 'active', created_at: '2026-07-10T00:00:00Z',
      },
    });
    vi.mocked(api.me).mockResolvedValue({
      data: {
        id: 1, name: 'Hoc vien da cap nhat', email: 'student@example.test', role: 'student', phone: '0900000000', avatar: null, status: 'active', created_at: '2026-07-10T00:00:00Z',
      },
    });

    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await act(async () => { await screen.getByRole('button', { name: 'login' }).click(); });
    await act(async () => { await screen.getByRole('button', { name: 'refresh' }).click(); });

    expect(screen.getByText('Hoc vien da cap nhat')).toBeInTheDocument();
    expect(api.me).toHaveBeenCalledWith('sanctum-token');
  });

  it('does not open a session after registration (UC-01 requires a separate login)', async () => {
    vi.mocked(api.register).mockResolvedValue({ token: 'ignored-token', user: { id: 2, name: 'Moi', email: 'n@example.test', role: 'student', phone: null, avatar: null, status: 'active', created_at: '2026-07-10T00:00:00Z' } });
    render(<AuthProvider><SessionProbe /></AuthProvider>);
    await act(async () => { await screen.getByRole('button', { name: 'register' }).click(); });
    expect(screen.getByText('guest')).toBeInTheDocument();
    expect(localStorage.getItem('seongon.session')).toBeNull();
  });
});
