import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { RequireAuth } from './RequireAuth';

const useAuth = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({ useAuth }));

describe('RequireAuth', () => {
  it('preserves the requested cart path when redirecting a guest to login', async () => {
    useAuth.mockReturnValue({ isReady: true, user: null });

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route element={<RequireAuth role="student" />}>
            <Route path="/cart" element={<div>Cart</div>} />
          </Route>
          <Route path="/login" element={<LocationState />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Return to /cart')).toBeInTheDocument();
  });

  it('redirects an admin away from student-only routes without blocking admin access', async () => {
    useAuth.mockReturnValue({ isReady: true, user: { id: 1, role: 'admin' } });

    render(
      <MemoryRouter initialEntries={['/my-courses']}>
        <Routes>
          <Route element={<RequireAuth role="student" />}>
            <Route path="/my-courses" element={<div>Student courses</div>} />
          </Route>
          <Route path="/admin" element={<div>Admin management</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Admin management')).toBeInTheDocument();
    expect(screen.queryByText('Student courses')).not.toBeInTheDocument();
  });
});

function LocationState() {
  const { state } = useLocation();
  return <div>Return to {(state as { from?: string } | null)?.from ?? 'missing'}</div>;
}
