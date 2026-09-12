import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnCoursePage } from './LearnCoursePage';

const myCourses = vi.hoisted(() => vi.fn());
const lessons = vi.hoisted(() => vi.fn());
const progress = vi.hoisted(() => vi.fn());
const quiz = vi.hoisted(() => vi.fn());
const submitQuiz = vi.hoisted(() => vi.fn());
const completeLesson = vi.hoisted(() => vi.fn());
const saveLessonProgress = vi.hoisted(() => vi.fn());
const startQuizAttempt = vi.hoisted(() => vi.fn());
const saveQuizAnswers = vi.hoisted(() => vi.fn());
const finalizeQuizAttempt = vi.hoisted(() => vi.fn());
const myReview = vi.hoisted(() => vi.fn());
const reviewCourse = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { myCourses, lessons, progress, quiz, submitQuiz, completeLesson, saveLessonProgress, startQuizAttempt, saveQuizAnswers, finalizeQuizAttempt, myReview, reviewCourse },
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
  it('completes a lesson when a tracked video reaches the end', async () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học video', video_url: 'https://cdn.example.test/lesson.mp4', description: null, duration: 30, position: 1, is_completed: false }] });
    progress.mockResolvedValue({ completed: 0, total: 1, percent: 0, can_take_exam: false });
    saveLessonProgress.mockResolvedValue({
      lesson: { lesson_id: 5, resume_position_seconds: 30, furthest_position_seconds: 30, video_duration_seconds: 30, watched_percent: 100, is_completed: true },
      course_progress: { completed: 1, total: 1, percent: 100, video_percent: 100, can_take_exam: true },
    });

    renderPage();

    fireEvent.ended(await screen.findByRole('video', { name: 'Bài học video' }));
    await waitFor(() => expect(saveLessonProgress).toHaveBeenCalledWith('student-token', 5, 30, 30));
  });

  it('keeps lesson playback percentage separate from whole-course progress', async () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học video', video_url: 'https://cdn.example.test/lesson.mp4', description: null, duration: 100, position: 1, is_completed: false, resume_position_seconds: 25, furthest_position_seconds: 40, video_duration_seconds: 100, watched_percent: 40 }] });
    progress.mockResolvedValue({ completed: 3, total: 4, percent: 75, video_percent: 97, can_take_exam: false });

    renderPage();

    expect(await screen.findByText('40% đã xem')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến độ khóa học' })).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('75%', { selector: 'h5' })).toBeInTheDocument();
  });

  it('offers the active lesson PDF on the backend host', async () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học PDF', material_url: '/storage/lesson-materials/guide.pdf', video_url: '', description: null, duration: null, position: 1, is_completed: false }] });
    progress.mockResolvedValue({ completed: 0, total: 1, percent: 0, can_take_exam: false });
    renderPage();
    const origin = new URL(import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1', window.location.origin).origin;
    expect(await screen.findByRole('link', { name: 'Mở tài liệu PDF' })).toHaveAttribute('href', `${origin}/storage/lesson-materials/guide.pdf`);
  });
  beforeEach(() => {
    useViewport(1024);
    myReview.mockResolvedValue({ data: null });
  });

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

  it('hides the final quiz after the enrollment has earned a certificate', async () => {
    myCourses.mockResolvedValue({
      ...enrollmentResponse,
      data: [{
        ...enrollmentResponse.data[0],
        certificate: { id: 8, enrollment_id: 1, certificate_code: 'CERT-COMPLETE-001', issued_at: '2026-09-12T00:00:00Z' },
      }],
    });
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: null, position: 1, is_completed: true }] });
    progress.mockResolvedValue({ completed: 1, total: 1, percent: 100, can_take_exam: true });

    renderPage();

    expect(screen.queryByRole('heading', { name: 'Chứng chỉ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bài kiểm tra cuối khóa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mở bài kiểm tra' })).not.toBeInTheDocument();
  });

  const reviewableCourse = () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: null, position: 1, is_completed: false }] });
    progress.mockResolvedValue({ completed: 0, total: 1, percent: 0, can_take_exam: false });
  };
  const reviewPayload = (rating: number, comment: string) => ({
    data: { id: 7, course_id: 10, rating, comment, status: 'visible', user: { id: 1, name: 'Nguyễn Văn An' }, created_at: '2026-03-04T00:00:00Z' },
  });

  it('keeps the submitted review on screen instead of clearing it', async () => {
    reviewableCourse();
    reviewCourse.mockResolvedValue(reviewPayload(4, 'Nội dung rõ ràng'));

    renderPage();
    const user = userEvent.setup();
    await user.type(await screen.findByRole('textbox', { name: 'Nhận xét của bạn' }), 'Nội dung rõ ràng');
    await user.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));

    expect(await screen.findByRole('button', { name: 'Cập nhật đánh giá' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nhận xét của bạn' })).toHaveValue('Nội dung rõ ràng');
    expect(screen.getByText('Cảm ơn bạn đã gửi đánh giá.')).toBeInTheDocument();
  });

  it('shows a pre-filled edit form when the student already reviewed the course', async () => {
    reviewableCourse();
    myReview.mockResolvedValue(reviewPayload(3, 'Đã đánh giá trước đó'));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Đánh giá của bạn' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nhận xét của bạn' })).toHaveValue('Đã đánh giá trước đó');
    expect(screen.getByRole('button', { name: 'Cập nhật đánh giá' })).toBeInTheDocument();
    expect(myReview).toHaveBeenCalledWith('student-token', 10);
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

  it('keeps the curriculum visible in the desktop learning workspace', async () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: null, position: 1, is_completed: false }] });
    progress.mockResolvedValue({ completed: 0, total: 1, percent: 0, can_take_exam: false });
    renderPage();
    expect(await screen.findByRole('navigation', { name: 'Nội dung khóa học' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mở nội dung khóa học' })).not.toBeInTheDocument();
  });

  it('shows the submitted attempt overview and wrong-answer review', async () => {
    myCourses.mockResolvedValue(enrollmentResponse);
    lessons.mockResolvedValue({ data: [{ id: 5, course_id: 10, title: 'Bài học 1', video_url: '', description: null, duration: null, position: 1, is_completed: true }] });
    progress.mockResolvedValue({ completed: 1, total: 1, percent: 100, can_take_exam: true });
    quiz.mockResolvedValue({ data: {
      id: 7,
      course_id: 10,
      title: 'Bài kiểm tra',
      pass_score: 80,
      max_attempts: 2,
      duration_minutes: 30,
      attempts_remaining: 2,
      ended: false,
      attempts: [],
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
          { question_id: 12, selected_option_id: 202, correct_answer_id: 201, is_correct: false },
        ],
      },
      passed: false,
      score: 50,
      certificate: null,
    });
    startQuizAttempt.mockResolvedValue({
      server_now: new Date().toISOString(),
      attempt: { id: 9, quiz_id: 7, score: null, passed: null, attempt_no: 1, status: 'in_progress', started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 1_800_000).toISOString(), finished_at: null, submitted_at: null, answers: [] },
    });
    saveQuizAnswers.mockResolvedValue({ server_now: new Date().toISOString(), attempt: { id: 9, status: 'in_progress', answers: [] } });
    finalizeQuizAttempt.mockResolvedValue({
      attempt: {
        id: 9,
        quiz_id: 7,
        score: 50,
        passed: false,
        attempt_no: 1,
        status: 'submitted',
        started_at: '2026-01-01T00:00:00Z',
        expires_at: '2026-01-01T00:30:00Z',
        finished_at: '2026-01-01T00:10:00Z',
        submitted_at: '2026-01-01T00:10:00Z',
        answers: [
          { question_id: 11, selected_option_id: 101, is_correct: true },
          { question_id: 12, selected_option_id: 202, correct_answer_id: 201, is_correct: false },
        ],
      },
      passed: false,
      score: 50,
      certificate: null,
      server_now: '2026-01-01T00:10:00Z',
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Mở bài kiểm tra' }));
    await user.click(await screen.findByRole('button', { name: 'Bắt đầu làm bài' }));
    await user.click(await screen.findByRole('radio', { name: 'Đáp án A' }));
    await user.click(screen.getByRole('radio', { name: 'Đáp án D' }));
    await user.click(screen.getByRole('button', { name: 'Nộp bài kiểm tra' }));

    expect(await screen.findByRole('heading', { name: 'Tổng quan các lần làm bài' })).toBeInTheDocument();
    expect(screen.getByText('Bạn đạt 50%.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Xem lại lượt 1' })[0]);
    expect(screen.getByText(/Câu hỏi sai/)).toBeInTheDocument();
    expect(screen.getByText(/Bạn đã chọn: Đáp án D/)).toBeInTheDocument();
    expect(screen.getByText(/Đáp án đúng: Đáp án C/)).toBeInTheDocument();
    expect(screen.queryByText(/Câu hỏi đúng/)).not.toBeInTheDocument();
    expect(finalizeQuizAttempt).toHaveBeenCalledWith('student-token', 9);
  });
});
