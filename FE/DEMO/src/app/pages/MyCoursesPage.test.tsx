import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MyCoursesPage } from './MyCoursesPage';

const myCourses = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { myCourses },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'student-token' }) }));

describe('MyCoursesPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('prevents navigation into an expired enrollment', async () => {
    myCourses.mockResolvedValue({
      data: [{ id: 1, course_id: 10, enrolled_at: '2025-01-01T00:00:00Z', expires_at: '2026-01-01T00:00:00Z', status: 'expired', is_expired: true, course: { title: 'SEO Foundation' }, progress: { completed: 1, total: 2, percent: 50, can_take_exam: false } }],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    expect(await screen.findByText('Khóa học đã hết hạn truy cập.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tiếp tục học' })).not.toBeInTheDocument();
  });

  it('uses the shared skeleton while enrollments are loading', () => {
    myCourses.mockImplementation(() => new Promise(() => {}));

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });

  it('shows progress hierarchy and defaults to active enrollments', async () => {
    myCourses.mockResolvedValue({
      data: [{ id: 2, course_id: 20, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'SEO AI Max' }, progress: { completed: 3, total: 10, percent: 30, can_take_exam: false } }],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    expect(await screen.findByRole('region', { name: 'Tiến độ học tập' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đang học' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps mobile course filters accessible and applies the selected filter', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    window.dispatchEvent(new Event('resize'));
    myCourses.mockResolvedValue({
      data: [{ id: 3, course_id: 30, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'Google Ads thực chiến' }, progress: { completed: 4, total: 10, percent: 40, can_take_exam: false } }],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    const filters = await screen.findByRole('toolbar', { name: 'Lọc khóa học' });
    fireEvent.click(screen.getByRole('button', { name: 'Đã hoàn thành' }));

    expect(filters).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đã hoàn thành' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Google Ads thực chiến')).not.toBeInTheDocument();
    expect(screen.getByText('Không có khóa học phù hợp với bộ lọc này.')).toBeVisible();
  });
});
