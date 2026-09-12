import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { PaymentSettingsPanel } from './PaymentSettingsPanel';

const mocks = vi.hoisted(() => ({ paymentSettings: vi.fn(), savePaymentSettings: vi.fn() }));
vi.mock('../../lib/api', async (original) => ({ ...await original<typeof import('../../lib/api')>(), api: mocks }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('shows a bank account only after the server accepts the saved configuration', async () => {
  const settings = {
    momo: { enabled: true, mode: 'mock', merchant_name: 'SEONGON Academy' },
    bank: { enabled: false, is_active: false, bank_name: '', account_name: '', account_number: '', branch: '', qr_payload: '', instructions: '' },
  };
  mocks.paymentSettings.mockResolvedValue({ data: settings });
  mocks.savePaymentSettings.mockImplementation((_token, submitted) => Promise.resolve({ data: submitted }));
  render(<PaymentSettingsPanel token="admin" />);
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: 'Tên ngân hàng' }), 'MB');
  await user.type(screen.getByRole('textbox', { name: 'Tên chủ tài khoản' }), 'DANG HA YEN');
  await user.type(screen.getByRole('textbox', { name: 'Số tài khoản' }), '012345678');
  expect(screen.queryByText('Tài khoản đã lưu')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Lưu cấu hình thanh toán' }));
  expect(await screen.findByText('Đã lưu cấu hình thanh toán.')).toBeInTheDocument();
  expect(screen.getByText('MB · 012345678')).toBeInTheDocument();
  expect(mocks.savePaymentSettings).toHaveBeenCalledWith('admin', expect.objectContaining({ bank: expect.objectContaining({ bank_name: 'MB', account_number: '012345678' }) }));
});
