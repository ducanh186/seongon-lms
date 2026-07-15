import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnCoursePage } from './LearnCoursePage';

const myCourses = vi.hoisted(() => vi.fn());
const lessons = vi.hoisted(() => vi.fn());
const progress = vi.hoisted(() => vi.fn());
const quiz = vi.hoisted(() => vi.fn());
const submitQuiz = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { myCourses, lessons, progress, quiz, submitQuiz },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'student-token' }) }));

const enrollmentResponse = {
  data: [{ id: 1, course_id: 10, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'SEO Foundation' } }],
  meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
};

function renderPage() {
  return render(<MemoryRouter initialEntries={['/learn/10']}><Routes><Route path="/learn/:courseId" element={<LearnCoursePage />} /></Routes></MemoryRouter>);
}

function useViewport(width: number) {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: width < 768 && query.includes('max-width'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

describe('LearnCoursePage', () => {
  beforeEach(() => useViewport(1024));

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps the quiz closed until backend progress allows it', async () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: null, position: 1, is_completed: false }] });
    progress.mockResolvedValue({ completed: 0, total: 1, percent: 0, can_take_exam: false });

    renderPage();

    expect(await screen.findByText('Hoàn thành 100% bài học để mở bài kiểm tra.')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Nội dung khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Tiến độ và tài nguyên' })).toBeInTheDocument();
    expect(quiz).not.toHaveBeenCalled();
  });

  it('uses the shared skeleton while learning data is loading', () => {
    myCourses.mockImplementation(() => new Promise(() => {}));
    lessons.mockImplementation(() => new Promise(() => {}));
    progress.mockImplementation(() => new Promise(() => {}));

    renderPage();

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });

  it('converts lesson duration from seconds to rounded-up minutes', async () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: 125, position: 1, is_completed: false }] });
    progress.mockResolvedValue({ completed: 0, total: 1, percent: 0, can_take_exam: false });

    renderPage();

    expect(await screen.findByText('3 phút')).toBeInTheDocument();
    expect(screen.queryByText('125 phút')).not.toBeInTheDocument();
  });

  it('moves curriculum into an accessible drawer on mobile', async () => {
    useViewport(390);
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: null, position: 1, is_completed: false }] });
    progress.mockResolvedValue({ completed: 0, total: 1, percent: 0, can_take_exam: false });
    const user = userEvent.setup();

    renderPage();

    const trigger = await screen.findByRole('button', { name: 'Mở nội dung khóa học' });
    expect(screen.queryByRole('navigation', { name: 'Nội dung khóa học' })).not.toBeInTheDocument();
    await user.click(trigger);
    expect(await screen.findByRole('navigation', { name: 'Nội dung khóa học' })).toBeInTheDocument();
  });

  it('retains submitted answers and shows correct and incorrect disabled states', async () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: null, position: 1, is_completed: true }] });
    progress.mockResolvedValue({ completed: 1, total: 1, percent: 100, can_take_exam: true });
    quiz.mockResolvedValue({ data: {
      id: 7,
      course_id: 10,
      title: 'Bài kiểm tra',
      pass_score: 80,
      max_attempts: 3,
      questions: [
        { id: 11, content: 'Câu hỏi đúng', options: [{ id: 101, content: 'Đáp án A' }, { id: 102, content: 'Đáp án B' }] },
        { id: 12, content: 'Câu hỏi sai', options: [{ id: 201, content: 'Đáp án C' }, { id: 202, content: 'Đáp án D' }] },
      ],
    } });
    submitQuiz.mockResolvedValue({
      attempt: {
        id: 9,
        quiz_id: 7,
        score: 50,
        passed: false,
        attempt_no: 1,
        submitted_at: '2026-01-01T00:00:00Z',
        answers: [
          { question_id: 11, selected_option_id: 101, is_correct: true },
          { question_id: 12, selected_option_id: 202, is_correct: false },
        ],
      },
      passed: false,
      score: 50,
      certificate: null,
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Mở bài kiểm tra' }));
    await user.click(await screen.findByRole('radio', { name: 'Đáp án A' }));
    await user.click(screen.getByRole('radio', { name: 'Đáp án D' }));
    await user.click(screen.getByRole('button', { name: 'Nộp bài kiểm tra' }));

    expect(await screen.findByText('Kết quả bài kiểm tra')).toBeInTheDocument();
    expect(screen.getByText('Đáp án A · Đúng')).toBeInTheDocument();
    expect(screen.getByText('Đáp án D · Chưa đúng')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Đáp án A/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Đáp án D/ })).toBeDisabled();
    expect(submitQuiz).toHaveBeenCalledWith('student-token', 10, [
      { question_id: 11, option_id: 101 },
      { question_id: 12, option_id: 202 },
    ]);
  });
});
