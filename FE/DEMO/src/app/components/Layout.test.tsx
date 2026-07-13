import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

const useAuth = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({ useAuth }));

afterEach(cleanup);

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
});
