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
  it('opens the selected order details with relational data and missing payment values', async () => {
    mockRows();
    ordersList.mockResolvedValue({ data: [
      { id: 31, user_id: 5, course_id: 10, total_amount: '399000', amount: '399000', status: 'failed', failure_reason: 'Không ghi nhận lý do thanh toán thất bại.', payment_method: null, paid_at: null, transaction_ref: null, user, course, created_at: '2026-08-15T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' },
    ], meta });
    const actor = userEvent.setup();
    render(<AdminErdReadSection section="orders" token="admin-token" onOpenCourse={vi.fn()} />);
    const row = within(await screen.findByRole('table', { name: 'Danh sách đơn hàng' })).getByRole('row', { name: /SEO Technical/ });
    row.focus();
    await actor.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết đơn hàng #31' });
    expect(within(dialog).getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(within(dialog).getByText('an@example.test')).toBeInTheDocument();
    expect(within(dialog).getByText('SEO Technical')).toBeInTheDocument();
    expect(within(dialog).getByText('10')).toBeInTheDocument();
    expect(within(dialog).getByText('399.000 đ')).toBeInTheDocument();
    expect(within(dialog).getByText('Không ghi nhận lý do thanh toán thất bại.')).toBeInTheDocument();
    expect(within(dialog).getAllByText('—')).toHaveLength(3);
    await actor.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await actor.click(row);
    expect(await screen.findByRole('dialog', { name: 'Chi tiết đơn hàng #31' })).toBeInTheDocument();
  });

  it('centers order totals without wrapping the currency unit', async () => {
    mockRows();
    render(<AdminErdReadSection section="orders" token="admin-token" />);
    const total = await screen.findByText('399.000 đ');
    expect(total).toHaveStyle({ whiteSpace: 'nowrap', textAlign: 'center' });
    expect(total.closest('td')).toHaveStyle({ textAlign: 'center' });
  });

  it('shows only final payment outcomes and the recorded failure reason', async () => {
    mockRows();
    ordersList.mockResolvedValue({ data: [
      { id: 32, user_id: 5, course_id: 10, total_amount: '399000', amount: '399000', status: 'failed', payment_status: 'cancelled', failure_reason: 'Người học đã hủy thanh toán.', payment_method: 'momo', paid_at: null, transaction_ref: null, user, course, created_at: '2026-08-15T00:00:00Z', updated_at: '2026-08-15T00:00:00Z' },
    ], meta });
    const actor = userEvent.setup();
    render(<AdminErdReadSection section="orders" token="admin-token" onOpenCourse={vi.fn()} />);

    await waitFor(() => expect(ordersList).toHaveBeenCalledWith('admin-token', expect.objectContaining({ payment_result: 'finished' })));
    const table = await screen.findByRole('table', { name: 'Danh sách đơn hàng' });
    expect(within(table).getByText('Thanh toán thất bại')).toBeInTheDocument();
    await actor.click(within(table).getByRole('row', { name: /SEO Technical/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết đơn hàng #32' });
    expect(within(dialog).getByText('Người học đã hủy thanh toán.')).toBeInTheDocument();
    expect(within(dialog).getByText('Lý do')).toBeInTheDocument();
    await actor.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await actor.click(screen.getByRole('combobox', { name: 'Trạng thái' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Tất cả', 'Đã thanh toán', 'Thanh toán thất bại']);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    ['roles', 'Danh sách vai trò', 'student'],
    ['carts', 'Danh sách giỏ hàng', '399.000 đ'],
    ['cartItems', 'Danh sách mục giỏ hàng', 'SEO Technical'],
    ['orders', 'Danh sách đơn hàng', '399.000 đ'],
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

  it('shows only ERD-backed Order columns and hides the internal transaction reference', async () => {
    mockRows();

    render(<AdminErdReadSection section="orders" token="admin-token" onOpenCourse={vi.fn()} />);

    const table = await screen.findByRole('table', { name: 'Danh sách đơn hàng' });
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Mã đơn hàng',
      'Học viên',
      'Mã khóa học',
      'Khóa học',
      'Tổng tiền',
      'Trạng thái',
      'Ngày tạo',
    ]);
    // orders.transaction_ref is a payment idempotency key, not a column on the
    // approved ERD — the reviewer read it as a second, conflicting order code.
    expect(within(table).queryByText('MOCK-001')).not.toBeInTheDocument();
  });

  it('applies filters only after confirmation and paginates server data', async () => {
    mockRows();
    ordersList.mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 2, per_page: 15, total: 16 },
    });
    const actor = userEvent.setup();

    render(<AdminErdReadSection section="orders" token="admin-token" onOpenCourse={vi.fn()} />);
    await waitFor(() => expect(ordersList).toHaveBeenCalledTimes(1));
    await actor.type(screen.getByLabelText('Tên khóa học'), 'SEO');

    expect(ordersList).toHaveBeenCalledTimes(1);
    await actor.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(ordersList).toHaveBeenLastCalledWith('admin-token', expect.objectContaining({ course_title: 'SEO', page: 1 })));

    await actor.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(ordersList).toHaveBeenLastCalledWith('admin-token', expect.objectContaining({ course_title: 'SEO', page: 2 })));
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
