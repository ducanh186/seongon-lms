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
const useCart = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { course, createOrder, payOrder },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'student-token' }) }));
vi.mock('../cart/CartContext', () => ({ useCart }));
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

  it('refreshes the server Cart after payment before navigating to My Courses', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    useCart.mockReturnValue({ refresh });
    course.mockResolvedValue({ data: courseData });
    createOrder.mockResolvedValue({ data: { id: 44, user_id: 1, course_id: 10, amount: '299000', status: 'pending', payment_method: null, transaction_ref: null, paid_at: null, created_at: '2026-07-10T00:00:00Z' } });
    payOrder.mockResolvedValue({ data: { ...courseData } });

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    const user = userEvent.setup();
    await screen.findByRole('complementary', { name: 'Tóm tắt đơn đăng ký' });
    await user.click(screen.getByRole('button', { name: 'Tạo đơn đăng ký' }));
    await user.click(await screen.findByRole('button', { name: 'Xác nhận thanh toán' }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/my-courses', expect.objectContaining({ state: expect.objectContaining({ notice: expect.any(String) }) }));
    expect(refresh.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
  });

  it('keeps a rejected payment recoverable instead of navigating to My Courses', async () => {
    const refresh = vi.fn();
    useCart.mockReturnValue({ refresh });
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
    expect(refresh).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still completes navigation when Cart refresh fails after a successful payment', async () => {
    const refresh = vi.fn().mockRejectedValue(new ApiError('Cart refresh failed.', 500));
    useCart.mockReturnValue({ refresh });
    course.mockResolvedValue({ data: courseData });
    createOrder.mockResolvedValue({ data: { id: 44, user_id: 1, course_id: 10, amount: '299000', status: 'pending', payment_method: null, transaction_ref: null, paid_at: null, created_at: '2026-07-10T00:00:00Z' } });
    payOrder.mockResolvedValue({});

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    const user = userEvent.setup();
    await screen.findByRole('complementary', { name: 'Tóm tắt đơn đăng ký' });
    await user.click(screen.getByRole('button', { name: 'Tạo đơn đăng ký' }));
    await user.click(await screen.findByRole('button', { name: 'Xác nhận thanh toán' }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/my-courses', expect.any(Object));
    expect(screen.queryByText('Thanh toán chưa hoàn tất. Bạn có thể thử lại.')).not.toBeInTheDocument();
  });

  it('shows the authoritative Order amount after Order creation', async () => {
    useCart.mockReturnValue({ refresh: vi.fn() });
    course.mockResolvedValue({ data: courseData });
    createOrder.mockResolvedValue({ data: { id: 44, user_id: 1, course_id: 10, amount: '325000', status: 'pending', payment_method: null, transaction_ref: null, paid_at: null, created_at: '2026-07-10T00:00:00Z' } });

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    const user = userEvent.setup();
    await screen.findByRole('complementary', { name: 'Tóm tắt đơn đăng ký' });
    await user.click(screen.getByRole('button', { name: 'Tạo đơn đăng ký' }));

    expect(await screen.findByText('325.000 đ')).toBeInTheDocument();
    expect(screen.queryByText('299.000 đ')).not.toBeInTheDocument();
  });

  it('uses the shared skeleton while loading course information', () => {
    course.mockImplementation(() => new Promise(() => {}));

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });
});
