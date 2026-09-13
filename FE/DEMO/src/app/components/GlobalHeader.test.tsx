import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHeader } from './GlobalHeader';

const { logout, useAuth } = vi.hoisted(() => ({
  logout: vi.fn().mockResolvedValue(undefined),
  useAuth: vi.fn(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../cart/CartContext', () => ({ useCart: () => ({ count: 0 }) }));
vi.mock('./CourseMegaMenu', () => ({ CourseMegaMenu: () => <div>mega</div> }));
vi.mock('./NotificationMenu', () => ({ NotificationMenu: () => <div>bell</div> }));

describe('GlobalHeader', () => {
  it('redirects to the login page after logout (UC-03)', async () => {
    useAuth.mockReturnValue({ user: { id: 1, name: 'Học viên', role: 'student', avatar: null }, logout });
    render(<MemoryRouter initialEntries={['/my-courses']}><Routes><Route path="*" element={<><GlobalHeader /><LocationProbe /></>} /></Routes></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Tài khoản Học viên/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));
    expect(logout).toHaveBeenCalledOnce();
    expect(await screen.findByText('path: /login')).toBeInTheDocument();
  });

  it('loads an uploaded profile avatar from the Laravel origin', () => {
    useAuth.mockReturnValue({
      user: { id: 1, name: 'Học viên', role: 'student', avatar: '/storage/profile-avatars/student.jpg' },
      logout,
    });

    render(<MemoryRouter><GlobalHeader /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'Tài khoản Học viên' }).querySelector('img')).toHaveAttribute(
      'src',
      'http://127.0.0.1:8000/storage/profile-avatars/student.jpg',
    );
  });
});

function LocationProbe() {
  return <div>path: {useLocation().pathname}</div>;
}
