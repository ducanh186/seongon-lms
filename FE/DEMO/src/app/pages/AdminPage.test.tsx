import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';

const adminStats = vi.hoisted(() => vi.fn());
const adminUsers = vi.hoisted(() => vi.fn());
const adminCategories = vi.hoisted(() => vi.fn());
const adminCourses = vi.hoisted(() => vi.fn());
const adminReviews = vi.hoisted(() => vi.fn());
const adminCourse = vi.hoisted(() => vi.fn());
const reorderLessons = vi.hoisted(() => vi.fn());
const deleteCourse = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { adminStats, adminUsers, adminCategories, adminCourses, adminReviews, adminCourse, reorderLessons, deleteCourse },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'admin-token' }) }));

const course = {
  id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: 'Course description', thumbnail: null,
  price: '299000', instructor_name: 'SEONGON', instructor_bio: null, level: 'beginner' as const, status: 'draft' as const,
  lessons_count: 2, reviews_count: 0, rating: null, category: { id: 1, name: 'SEO', slug: 'seo', description: null }, created_at: '2026-07-10T00:00:00Z',
};

const selectedCourse = {
  ...course,
  lessons: [
    { id: 7, course_id: 10, title: 'Bài học 1', video_url: 'https://example.test/one', description: null, duration: 120, position: 1 },
    { id: 9, course_id: 10, title: 'Bài học 2', video_url: 'https://example.test/two', description: null, duration: 120, position: 2 },
  ],
  quiz: {
    id: 3, course_id: 10, title: 'Quiz SEO', pass_score: 75, max_attempts: 3,
    questions: [{ id: 18, content: 'Câu hỏi hiện có', options: [{ id: 31, content: 'Đáp án đúng', is_correct: true }, { id: 32, content: 'Đáp án sai', is_correct: false }] }],
  },
};

function mockAdminData() {
  adminStats.mockResolvedValue({ students: 1, courses: 1, published_courses: 0, enrollments: 0, certificates: 0, completion_rate: 0, revenue: 0 });
  adminUsers.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } });
  adminCategories.mockResolvedValue({ data: [{ id: 1, name: 'SEO', slug: 'seo', description: null, courses_count: 1 }] });
  adminCourses.mockResolvedValue({ data: [course], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } });
  adminReviews.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } });
  adminCourse.mockResolvedValue({ data: selectedCourse });
  reorderLessons.mockResolvedValue({ data: selectedCourse.lessons });
  deleteCourse.mockResolvedValue({});
}

describe('AdminPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('exposes the five-section management navigation and updates its active state', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    const navigation = await screen.findByRole('navigation', { name: 'Quản trị' });
    expect(within(navigation).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Dashboard',
      'Người dùng',
      'Danh mục',
      'Khóa học',
      'Đánh giá',
    ]);
    expect(within(navigation).getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(within(navigation).getByRole('button', { name: 'Khóa học' }));

    expect(within(navigation).getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('table', { name: 'Danh sách khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Danh sách khóa học, có thể cuộn ngang' })).toHaveAttribute('tabindex', '0');
  });

  it('names the selected course before running its destructive mutation', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Khóa học' }));
    await user.click(screen.getByRole('button', { name: 'Xóa' }));

    expect(screen.getByRole('dialog', { name: 'Xóa khóa học SEO Foundation?' })).toBeInTheDocument();
    expect(deleteCourse).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));

    expect(deleteCourse).toHaveBeenCalledWith('admin-token', 10);
  });

  it('loads existing quiz questions when an admin opens course content', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Khóa học' }));
    await user.click(screen.getByRole('button', { name: 'Nội dung' }));

    expect(await screen.findByDisplayValue('Câu hỏi hiện có')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Đáp án đúng')).toBeInTheDocument();
    expect(adminCourse).toHaveBeenCalledWith('admin-token', 10);
  });

  it('sends the complete lesson id order after moving the first lesson down', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Khóa học' }));
    await user.click(screen.getByRole('button', { name: 'Nội dung' }));
    await user.click(await screen.findByRole('button', { name: 'Di chuyển bài học 1 xuống' }));

    expect(reorderLessons).toHaveBeenCalledWith('admin-token', 10, [9, 7]);
  });
});
