import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LearnCoursePage } from './LearnCoursePage';

const myCourses = vi.hoisted(() => vi.fn());
const lessons = vi.hoisted(() => vi.fn());
const progress = vi.hoisted(() => vi.fn());
const quiz = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { myCourses, lessons, progress, quiz },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'student-token' }) }));

describe('LearnCoursePage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps the quiz closed until backend progress allows it', async () => {
    myCourses.mockResolvedValue({ data: [{ id: 1, course_id: 10, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'SEO Foundation' } }], meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 } });
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: null, position: 1, is_completed: false }] });
    progress.mockResolvedValue({ completed: 0, total: 1, percent: 0, can_take_exam: false });

    render(<MemoryRouter initialEntries={['/learn/10']}><Routes><Route path="/learn/:courseId" element={<LearnCoursePage />} /></Routes></MemoryRouter>);

    expect(await screen.findByText('Hoàn thành 100% bài học để mở bài kiểm tra.')).toBeInTheDocument();
    expect(quiz).not.toHaveBeenCalled();
  });

  it('uses the shared skeleton while learning data is loading', () => {
    myCourses.mockImplementation(() => new Promise(() => {}));
    lessons.mockImplementation(() => new Promise(() => {}));
    progress.mockImplementation(() => new Promise(() => {}));

    render(<MemoryRouter initialEntries={['/learn/10']}><Routes><Route path="/learn/:courseId" element={<LearnCoursePage />} /></Routes></MemoryRouter>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });
});
