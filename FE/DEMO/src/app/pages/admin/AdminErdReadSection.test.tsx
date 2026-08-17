import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminErdReadSection, type AdminErdReadSectionKey } from './AdminErdReadSection';

const rolesList = vi.hoisted(() => vi.fn());
const cartsList = vi.hoisted(() => vi.fn());
const cartItemsList = vi.hoisted(() => vi.fn());
const ordersList = vi.hoisted(() => vi.fn());
const courseCategoriesList = vi.hoisted(() => vi.fn());
const learningProgressList = vi.hoisted(() => vi.fn());
const questionsList = vi.hoisted(() => vi.fn());
const answersList = vi.hoisted(() => vi.fn());

vi.mock('../../data/repositories/adminRepositories', () => ({
  adminRepositories: {
    roles: { list: rolesList },
    carts: { list: cartsList },
    cartItems: { list: cartItemsList },
    orders: { list: ordersList },
    courseCategories: { list: courseCategoriesList },
    learningProgress: { list: learningProgressList },
    questions: { list: questionsList },
    answers: { list: answersList },
  },
}));

const meta = { current_page: 1, last_page: 1, per_page: 15, total: 1 };
const user = {
  id: 5,
  name: 'Nguyễn Văn An',
  email: 'an@example.test',
  role: 'student' as const,
  phone: null,
  avatar: null,
  status: 'active' as const,
  created_at: '2026-08-01T00:00:00Z',
};
const course = {
  id: 10,
  category_id: 1,
  title: 'SEO Technical',
  slug: 'seo-technical',
  description: null,
  thumbnail: null,
  price: '399000',
  instructor_name: 'SEONGON',
  instructor_bio: null,
  level: 'beginner' as const,
  status: 'published' as const,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-15T00:00:00Z',
};

function mockRows() {
  rolesList.mockResolvedValue({
    data: [{ id: 2, code: 'student', name: 'Học viên', description: 'Người học', users_count: 117, created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' }],
    meta,
  });
  cartsList.mockResolvedValue({
    data: [{ id: 8, user_id: 5, user, items_count: 1, items: [], current_total: '399000.00', created_at: '2026-08-10T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' }],
    meta,
  });
  cartItemsList.mockResolvedValue({
    data: [{ id: 9, cart_id: 8, user_id: 5, course_id: 10, user, course, created_at: '2026-08-10T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' }],
    meta,
  });
  ordersList.mockResolvedValue({
    data: [{ id: 30, user_id: 5, course_id: 10, amount: '399000', total_amount: '399000', status: 'paid', payment_method: 'card', transaction_ref: 'MOCK-001', paid_at: '2026-08-15T00:00:00Z', user, course, created_at: '2026-08-15T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' }],
    meta,
  });
  courseCategoriesList.mockResolvedValue({
    data: [{ id: 11, course_id: 10, category_id: 1, course: { id: 10, title: 'SEO Technical' }, category: { id: 1, name: 'SEO' }, created_at: '2026-08-10T00:00:00Z', updated_at: '2026-08-10T00:00:00Z' }],
    meta,
  });
  learningProgressList.mockResolvedValue({
    data: [{ id: 12, enrollment_id: 44, lesson_id: 7, is_completed: true, completed_at: '2026-08-15T00:00:00Z', user, course, lesson: { id: 7, course_id: 10, title: 'Phân tích Search Console' }, created_at: '2026-08-12T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' }],
    meta,
  });
  questionsList.mockResolvedValue({
    data: [{ id: 18, exam_id: 3, content: 'SEO Technical là gì?', sort_order: 1, answers_count: 2, exam: { id: 3, title: 'Bài kiểm tra SEO' }, course: { id: 10, title: 'SEO Technical' }, created_at: '2026-08-12T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' }],
    meta,
  });
  answersList.mockResolvedValue({
    data: [{ id: 31, question_id: 18, content: 'Tối ưu kỹ thuật website', is_correct: true, question: { id: 18, content: 'SEO Technical là gì?' }, exam: { id: 3, title: 'Bài kiểm tra SEO' }, course: { id: 10, title: 'SEO Technical' }, created_at: '2026-08-12T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' }],
    meta,
  });
}

describe('AdminErdReadSection', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    ['roles', 'Danh sách vai trò', 'student'],
    ['carts', 'Danh sách giỏ hàng', '399.000 đ'],
    ['cartItems', 'Danh sách mục giỏ hàng', 'SEO Technical'],
    ['orders', 'Danh sách đơn hàng', 'MOCK-001'],
    ['courseCategories', 'Danh sách gán danh mục', 'SEO'],
    ['learningProgress', 'Danh sách tiến độ học tập', 'Phân tích Search Console'],
    ['questions', 'Danh sách câu hỏi', 'SEO Technical là gì?'],
    ['answers', 'Danh sách đáp án', 'Tối ưu kỹ thuật website'],
  ] satisfies Array<[AdminErdReadSectionKey, string, string]>)(
    'renders %s from its repository',
    async (section, tableLabel, expectedText) => {
      mockRows();

      render(<AdminErdReadSection section={section} token="admin-token" onOpenCourse={vi.fn()} />);

      const table = await screen.findByRole('table', { name: tableLabel });
      expect(within(table).getByText(expectedText)).toBeInTheDocument();
      expect(within(table).queryByRole('button', { name: /xóa/i })).not.toBeInTheDocument();
    },
  );

  it('applies filters only after confirmation and paginates server data', async () => {
    mockRows();
    ordersList.mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 2, per_page: 15, total: 16 },
    });
    const actor = userEvent.setup();

    render(<AdminErdReadSection section="orders" token="admin-token" onOpenCourse={vi.fn()} />);
    await waitFor(() => expect(ordersList).toHaveBeenCalledTimes(1));
    await actor.type(screen.getByLabelText('Tìm kiếm'), 'SEO');

    expect(ordersList).toHaveBeenCalledTimes(1);
    await actor.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(ordersList).toHaveBeenLastCalledWith('admin-token', expect.objectContaining({ q: 'SEO', page: 1 })));

    await actor.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(ordersList).toHaveBeenLastCalledWith('admin-token', expect.objectContaining({ q: 'SEO', page: 2 })));
  });

  it('opens the existing parent Course editor from Questions and stays read-only', async () => {
    mockRows();
    const onOpenCourse = vi.fn();
    const actor = userEvent.setup();

    render(<AdminErdReadSection section="questions" token="admin-token" onOpenCourse={onOpenCourse} />);

    const table = await screen.findByRole('table', { name: 'Danh sách câu hỏi' });
    await actor.click(within(table).getByRole('button', { name: 'Mở bài kiểm tra' }));

    expect(onOpenCourse).toHaveBeenCalledWith(10);
    expect(within(table).queryByRole('button', { name: /xóa|sửa|tạo/i })).not.toBeInTheDocument();
  });

  it('renders explicit empty and retryable error states', async () => {
    cartsList.mockResolvedValueOnce({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    });
    const view = render(<AdminErdReadSection section="carts" token="admin-token" onOpenCourse={vi.fn()} />);
    expect(await screen.findByText('Không có giỏ hàng phù hợp.')).toBeInTheDocument();

    view.unmount();
    rolesList.mockRejectedValueOnce(new Error('network'));
    render(<AdminErdReadSection section="roles" token="admin-token" onOpenCourse={vi.fn()} />);
    expect(await screen.findByText('Không thể tải dữ liệu quản trị.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
