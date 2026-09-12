import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CheckoutPage } from './CheckoutPage';

const mocks = vi.hoisted(() => ({ course: vi.fn(), createOrder: vi.fn(), paymentMethods: vi.fn(), startPayment: vi.fn(), mockPaymentCallback: vi.fn(), updateProfile: vi.fn(), refreshUser: vi.fn(), refresh: vi.fn() }));
vi.mock('../lib/api', async (original) => ({ ...await original<typeof import('../lib/api')>(), api: mocks }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'student', user: { name: 'Student', email: 'test@example.test', phone: '0901234567' }, refreshUser: mocks.refreshUser }) }));
vi.mock('../cart/CartContext', () => ({ useCart: () => ({ refresh: mocks.refresh }) }));
const order = { id: 44, course_id: 10, amount: '49000', status: 'pending', payment_status: 'draft', payment_method: null };
beforeEach(() => {
  mocks.course.mockResolvedValue({ data: { id: 10, title: 'SEO Course', slug: 'seo', price: '49000' } });
  mocks.createOrder.mockResolvedValue({ data: order });
  mocks.paymentMethods.mockResolvedValue({ data: [{ code: 'momo', label: 'Thanh toán qua ví MoMo', mode: 'mock' }, { code: 'bank', label: 'Thanh toán qua ngân hàng', mode: 'mock' }, { code: 'card', label: 'Thanh toán bằng thẻ (mô phỏng)', mode: 'mock' }] });
  mocks.updateProfile.mockResolvedValue({}); mocks.refresh.mockResolvedValue(undefined);
  mocks.startPayment.mockImplementation((_token, _id, method) => Promise.resolve({ data: { ...order, payment_method: method, payment_status: 'pending', mock_callback_allowed: true, payment_expires_at: new Date(Date.now() + 900000).toISOString(), payment_session: { token: 'session', mode: 'mock', reference: 'LMS-44', qr_payload: 'sandbox-order-44', bank: method === 'bank' ? { bank_name: 'API Bank', account_name: 'API Receiver', account_number: '123456789' } : null } } }));
  mocks.mockPaymentCallback.mockResolvedValue({ order: { ...order, payment_method: 'momo', payment_status: 'paid', status: 'paid' } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('starts a real API session on Continue and only confirms through the mock callback', async () => {
  render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Lưu thông tin và tạo đơn' }));
  expect(screen.queryByText('Chờ thanh toán')).not.toBeInTheDocument();
  await user.click(await screen.findByRole('button', { name: 'Tiếp tục' }));
  expect(await screen.findByRole('heading', { name: 'Cổng thanh toán MoMo' })).toBeInTheDocument();
  expect(mocks.mockPaymentCallback).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Mã QR thanh toán')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Tôi đã thanh toán' }));
  expect(await screen.findByRole('link', { name: 'Lịch sử giao dịch' })).toBeInTheDocument();
  expect(mocks.mockPaymentCallback).toHaveBeenCalledWith('student', 44, 'session', 'success');
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it('uses bank account details from the started session', async () => {
  render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Lưu thông tin và tạo đơn' }));
  await user.click(await screen.findByRole('radio', { name: 'Thanh toán qua ngân hàng' }));
  await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  expect(await screen.findByText('API Bank')).toBeInTheDocument();
  expect(screen.getByText('123456789')).toBeInTheDocument();
  expect(mocks.startPayment).toHaveBeenCalledWith('student', 44, 'bank');
});

it('requires a card type before confirming a mock card payment', async () => {
  render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Lưu thông tin và tạo đơn' }));
  await user.click(await screen.findByRole('radio', { name: 'Thanh toán bằng thẻ (mô phỏng)' }));
  await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
  expect(await screen.findByRole('heading', { name: 'Thanh toán bằng thẻ' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Xác nhận thanh toán mô phỏng' })).toBeDisabled();
  expect(screen.queryByLabelText('Mã QR thanh toán')).not.toBeInTheDocument();
  await user.click(screen.getByRole('radio', { name: /Thẻ thanh toán quốc tế/ }));
  expect(screen.getByRole('button', { name: 'Xác nhận thanh toán mô phỏng' })).toBeEnabled();
  expect(mocks.startPayment).toHaveBeenCalledWith('student', 44, 'card');
});
