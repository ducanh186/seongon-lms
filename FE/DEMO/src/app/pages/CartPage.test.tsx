import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { CartPage } from './CartPage';

const useCart = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const course = vi.hoisted(() => vi.fn());

vi.mock('../cart/CartContext', () => ({ useCart }));
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { course },
}));

const items = [
  { courseId: 10, slug: 'seo-foundation', title: 'SEO Foundation', price: '299000', thumbnail: null },
  { courseId: 20, slug: 'google-ads', title: 'Google Ads', price: '199000', thumbnail: null },
];

describe('CartPage', () => {
  beforeEach(() => {
    course.mockRejectedValue(new ApiError('Không thể tải khóa học.', 503));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the cart count and total before sending each course through the existing checkout route', () => {
    useCart.mockReturnValue({ items, remove, count: 2 });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Giỏ hàng' })).toBeInTheDocument();
    expect(screen.getByText('2 khóa học')).toBeInTheDocument();
    expect(screen.getByText('498.000 đ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thanh toán SEO Foundation' })).toHaveAttribute('href', '/checkout/seo-foundation');
    expect(screen.getByRole('link', { name: 'Thanh toán Google Ads' })).toHaveAttribute('href', '/checkout/google-ads');
  });

  it('removes the selected course from the cart', async () => {
    useCart.mockReturnValue({ items, remove, count: 2 });
    const user = userEvent.setup();

    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Xóa SEO Foundation khỏi giỏ hàng' }));

    expect(remove).toHaveBeenCalledWith(10);
  });

  it('removes courses that are no longer public and explains the cart update', async () => {
    course.mockRejectedValue(new ApiError('Không tìm thấy khóa học.', 404));
    useCart.mockReturnValue({ items: [items[0]], remove, replace, count: 1 });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    expect(await screen.findByText('Một số khóa học không còn công khai và đã được xóa khỏi giỏ hàng.')).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith([]);
  });

  it('replaces stale cart fields with the current public course data', async () => {
    course.mockResolvedValue({
      data: {
        id: 10,
        slug: 'seo-foundation-2026',
        title: 'SEO Foundation 2026',
        price: '399000',
        thumbnail: 'https://example.test/seo-2026.jpg',
      },
    });
    useCart.mockReturnValue({ items: [items[0]], remove, replace, count: 1 });

    render(<MemoryRouter><CartPage /></MemoryRouter>);

    await screen.findByText('SEO Foundation 2026');
    expect(replace).toHaveBeenCalledWith([{
      courseId: 10,
      slug: 'seo-foundation-2026',
      title: 'SEO Foundation 2026',
      price: '399000',
      thumbnail: 'https://example.test/seo-2026.jpg',
    }]);
  });
});
