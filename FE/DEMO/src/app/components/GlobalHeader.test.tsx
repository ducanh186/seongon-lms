import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHeader } from './GlobalHeader';

const logout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, name: 'Học viên', role: 'student', avatar: null }, logout }) }));
vi.mock('../cart/CartContext', () => ({ useCart: () => ({ count: 0 }) }));
vi.mock('./CourseMegaMenu', () => ({ CourseMegaMenu: () => <div>mega</div> }));
vi.mock('./NotificationMenu', () => ({ NotificationMenu: () => <div>bell</div> }));

describe('GlobalHeader', () => {
  it('redirects to the login page after logout (UC-03)', async () => {
    render(<MemoryRouter initialEntries={['/my-courses']}><Routes><Route path="*" element={<><GlobalHeader /><LocationProbe /></>} /></Routes></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Tài khoản Học viên/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));
    expect(logout).toHaveBeenCalledOnce();
    expect(await screen.findByText('path: /login')).toBeInTheDocument();
  });
});

function LocationProbe() {
  return <div>path: {useLocation().pathname}</div>;
}
