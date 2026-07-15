import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { CheckoutPage } from './CheckoutPage';

const course = vi.hoisted(() => vi.fn());
const createOrder = vi.hoisted(() => vi.fn());
const payOrder = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { course, createOrder, payOrder },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'student-token' }) }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
  useParams: () => ({ slug: 'seo-foundation' }),
}));

const courseData = {
  id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: null, thumbnail: null,
  price: '299000', instructor_name: null, instructor_bio: null, level: 'beginner' as const, status: 'published' as const, created_at: '2026-07-10T00:00:00Z',
};

describe('CheckoutPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps a rejected payment recoverable instead of navigating to My Courses', async () => {
    course.mockResolvedValue({ data: courseData });
    createOrder.mockResolvedValue({ data: { id: 44, user_id: 1, course_id: 10, amount: '299000', status: 'pending', payment_method: null, transaction_ref: null, paid_at: null, created_at: '2026-07-10T00:00:00Z' } });
    payOrder.mockRejectedValue(new ApiError('Thanh toán thất bại.', 422));

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    expect(await screen.findByRole('complementary', { name: 'Tóm tắt đơn đăng ký' })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tạo đơn đăng ký' }));
    await user.click(await screen.findByRole('button', { name: 'Xác nhận thanh toán' }));

    expect(await screen.findByText('Thanh toán thất bại.')).toBeInTheDocument();
    expect(createOrder).toHaveBeenCalledWith('student-token', 10);
    expect(payOrder).toHaveBeenCalledWith('student-token', 44, 'qr');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('uses the shared skeleton while loading course information', () => {
    course.mockImplementation(() => new Promise(() => {}));

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });
});
