import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartPage } from './CartPage';

const useCart = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());

vi.mock('../cart/CartContext', () => ({ useCart }));

const items = [
  { courseId: 10, slug: 'seo-foundation', title: 'SEO Foundation', price: '299000', thumbnail: null },
  { courseId: 20, slug: 'google-ads', title: 'Google Ads', price: '199000', thumbnail: null },
];

describe('CartPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the cart count and total before sending each course through the existing checkout route', () => {
    useCart.mockReturnValue({ items, remove, count: 2, loading: false, error: null });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Giỏ hàng' })).toBeInTheDocument();
    expect(screen.getByText('2 khóa học')).toBeInTheDocument();
    expect(screen.getByText('498.000 đ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thanh toán SEO Foundation' })).toHaveAttribute('href', '/checkout/seo-foundation');
    expect(screen.getByRole('link', { name: 'Thanh toán Google Ads' })).toHaveAttribute('href', '/checkout/google-ads');
  });

  it('removes the selected course from the cart', async () => {
    useCart.mockReturnValue({ items, remove, count: 2, loading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Xóa SEO Foundation khỏi giỏ hàng' }));

    expect(remove).toHaveBeenCalledWith(10);
  });

  it('shows the shared skeleton while the authoritative DB Cart is loading', () => {
    useCart.mockReturnValue({ items: [], remove, count: 0, loading: true, error: null });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });

  it('shows a server Cart error without falling back to a local snapshot', () => {
    useCart.mockReturnValue({ items: [], remove, count: 0, loading: false, error: 'Không thể tải giỏ hàng.' });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(screen.getByText('Không thể tải giỏ hàng.')).toBeInTheDocument();
  });
});
