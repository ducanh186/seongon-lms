import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { CheckoutPage } from './CheckoutPage';

const course = vi.hoisted(() => vi.fn());
const createOrder = vi.hoisted(() => vi.fn());
const payOrder = vi.hoisted(() => vi.fn());
const paymentMethods = vi.hoisted(() => vi.fn());
const startPayment = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const useCart = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());
const updateProfile = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { course, createOrder, payOrder, updateProfile, paymentMethods, startPayment, mockPaymentCallback: payOrder },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth }));
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
  beforeEach(() => {
    paymentMethods.mockResolvedValue({ data: [{ code: 'momo', label: 'Thanh toán qua ví MoMo', mode: 'mock' }] });
    startPayment.mockResolvedValue({ data: { id: 44, amount: '299000', status: 'pending', payment_status: 'pending', payment_method: 'momo', payment_session: { token: 'session', qr_payload: 'test-order-44', mode: 'mock' }, payment_expires_at: new Date(Date.now() + 900000).toISOString(), mock_callback_allowed: true } });
    useAuth.mockReturnValue({
      token: 'student-token',
      user: { id: 1, name: 'Nguyễn Văn An', email: 'an@example.test', phone: '0901234567', avatar: null, role: 'student' },
      refreshUser: vi.fn().mockResolvedValue(undefined),
    });
    updateProfile.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('refreshes the server Cart after payment and offers transaction history', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    useCart.mockReturnValue({ refresh });
    course.mockResolvedValue({ data: courseData });
    createOrder.mockResolvedValue({ data: { id: 44, user_id: 1, course_id: 10, amount: '299000', status: 'pending', payment_method: null, transaction_ref: null, paid_at: null, created_at: '2026-07-10T00:00:00Z' } });
    payOrder.mockResolvedValue({ order: { id: 44, amount: '299000', status: 'paid', payment_status: 'paid' } });

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    const user = userEvent.setup();
    await screen.findByRole('complementary', { name: 'Tóm tắt đơn đăng ký' });
    await user.click(screen.getByRole('button', { name: 'Lưu thông tin và tạo đơn' }));
    await user.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
    await user.click(await screen.findByRole('button', { name: 'Mô phỏng thanh toán thành công' }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Lịch sử giao dịch' })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Lưu thông tin và tạo đơn' }));
    await user.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
    await user.click(await screen.findByRole('button', { name: 'Mô phỏng thanh toán thành công' }));

    expect(await screen.findByText('Thanh toán thất bại.')).toBeInTheDocument();
    expect(createOrder).toHaveBeenCalledWith('student-token', 10);
    expect(payOrder).toHaveBeenCalledWith('student-token', 44, 'session', 'success');
    expect(refresh).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows account-backed registration information and saves it before creating the Order', async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({
      token: 'student-token',
      user: { id: 1, name: 'Nguyễn Văn An', email: 'an@example.test', phone: '', avatar: null, role: 'student' },
      refreshUser,
    });
    useCart.mockReturnValue({ refresh: vi.fn() });
    course.mockResolvedValue({ data: courseData });
    updateProfile.mockResolvedValue({ data: {} });
    createOrder.mockResolvedValue({ data: { id: 44, user_id: 1, course_id: 10, amount: '299000', status: 'pending' } });

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    const user = userEvent.setup();
    expect(await screen.findByRole('textbox', { name: 'Họ và tên' })).toHaveValue('Nguyễn Văn An');
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('an@example.test');
    await user.type(screen.getByRole('textbox', { name: 'Số điện thoại' }), '0901234567');
    await user.click(screen.getByRole('button', { name: 'Lưu thông tin và tạo đơn' }));

    expect(updateProfile).toHaveBeenCalledWith('student-token', {
      name: 'Nguyễn Văn An',
      phone: '0901234567',
      avatar: null,
    });
    expect(refreshUser).toHaveBeenCalledOnce();
    expect(createOrder).toHaveBeenCalledWith('student-token', 10);
  });

  it('still shows successful payment when Cart refresh fails', async () => {
    const refresh = vi.fn().mockRejectedValue(new ApiError('Cart refresh failed.', 500));
    useCart.mockReturnValue({ refresh });
    course.mockResolvedValue({ data: courseData });
    createOrder.mockResolvedValue({ data: { id: 44, user_id: 1, course_id: 10, amount: '299000', status: 'pending', payment_method: null, transaction_ref: null, paid_at: null, created_at: '2026-07-10T00:00:00Z' } });
    payOrder.mockResolvedValue({ order: { id: 44, amount: '299000', status: 'paid', payment_status: 'paid' } });

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    const user = userEvent.setup();
    await screen.findByRole('complementary', { name: 'Tóm tắt đơn đăng ký' });
    await user.click(screen.getByRole('button', { name: 'Lưu thông tin và tạo đơn' }));
    await user.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
    await user.click(await screen.findByRole('button', { name: 'Mô phỏng thanh toán thành công' }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Lịch sử giao dịch' })).toBeInTheDocument();
    expect(screen.queryByText('Thanh toán chưa hoàn tất. Bạn có thể thử lại.')).not.toBeInTheDocument();
  });

  it('shows the authoritative Order amount after Order creation', async () => {
    useCart.mockReturnValue({ refresh: vi.fn() });
    course.mockResolvedValue({ data: courseData });
    createOrder.mockResolvedValue({ data: { id: 44, user_id: 1, course_id: 10, amount: '325000', status: 'pending', payment_method: null, transaction_ref: null, paid_at: null, created_at: '2026-07-10T00:00:00Z' } });

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    const user = userEvent.setup();
    await screen.findByRole('complementary', { name: 'Tóm tắt đơn đăng ký' });
    await user.click(screen.getByRole('button', { name: 'Lưu thông tin và tạo đơn' }));

    expect(await screen.findByText('Tổng cộng: 325.000 đ')).toBeInTheDocument();
    expect(screen.queryByText('299.000 đ')).not.toBeInTheDocument();
  });

  it('uses the shared skeleton while loading course information', () => {
    course.mockImplementation(() => new Promise(() => {}));

    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });
});
