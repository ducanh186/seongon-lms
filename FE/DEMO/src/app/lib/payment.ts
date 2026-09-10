import type { ApiOrder, PaymentStatus } from './contracts';

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  draft: 'Chưa thanh toán', pending: 'Chờ thanh toán', paid: 'Đã thanh toán', cancelled: 'Đã hủy', expired: 'Hết hạn',
};
export function paymentStatus(order: ApiOrder): PaymentStatus {
  return order.payment_status ?? (order.status === 'paid' ? 'paid' : order.status === 'failed' ? 'cancelled' : order.transaction_ref ? 'pending' : 'draft');
}
export function paymentMethodLabel(method: ApiOrder['payment_method']): string {
  return method ? ({ momo: 'MoMo', bank: 'Ngân hàng', card: 'Thẻ', qr: 'Mã QR' }[method] ?? method) : '—';
}
