import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from './CartContext';

const useAuth = vi.hoisted(() => vi.fn());
const getCart = vi.hoisted(() => vi.fn());
const addCartItem = vi.hoisted(() => vi.fn());
const deleteCartItem = vi.hoisted(() => vi.fn());
const clearCart = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { getCart, addCartItem, deleteCartItem, clearCart },
}));

const seoCourse = {
  id: 10,
  category_id: 1,
  title: 'SEO Foundation',
  slug: 'seo-foundation',
  description: null,
  thumbnail: null,
  price: '299000.00',
  instructor_name: null,
  instructor_bio: null,
  level: 'beginner' as const,
  status: 'published' as const,
  created_at: '2026-08-01T00:00:00Z',
};

const adsCourse = { ...seoCourse, id: 20, title: 'Google Ads', slug: 'google-ads', price: '199000.00' };

function serverCart(courses = [seoCourse]) {
  return {
    data: {
      id: courses.length ? 7 : null,
      user_id: 1,
      items: courses.map((course, index) => ({ id: 100 + index, course_id: course.id, course, created_at: '2026-08-16T00:00:00Z' })),
      count: courses.length,
      total_amount: courses.reduce((sum, course) => sum + Number(course.price), 0).toFixed(2),
      updated_at: '2026-08-16T00:00:00Z',
    },
  };
}

function CartProbe() {
  const { add, clear, count, items, loading, remove } = useCart();

  return (
    <div>
      <output data-testid="header-cart-count">{count}</output>
      <output data-testid="cart-course-ids">{items.map((item) => item.courseId).join(',')}</output>
      <output data-testid="cart-loading">{String(loading)}</output>
      <button onClick={() => void add(20)}>Add Ads</button>
      <button onClick={() => void remove(10).catch(() => undefined)}>Remove SEO</button>
      <button onClick={() => void remove(20).catch(() => undefined)}>Remove Ads</button>
      <button onClick={() => void clear()}>Clear cart</button>
    </div>
  );
}

describe('CartProvider API persistence', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('CART-09 backs the shared Header/cart count with GET Cart API state', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    getCart.mockResolvedValue(serverCart([seoCourse, adsCourse]));

    render(<CartProvider><CartProbe /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId('header-cart-count')).toHaveTextContent('2'));
    expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('10,20');
    expect(getCart).toHaveBeenCalledWith('student-token');
  });

  it('adds only course_id through the API and replaces state with the server response', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    getCart.mockResolvedValue(serverCart([]));
    addCartItem.mockResolvedValue(serverCart([adsCourse]));
    const user = userEvent.setup();
    render(<CartProvider><CartProbe /></CartProvider>);

    await waitFor(() => expect(getCart).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Add Ads' }));

    expect(addCartItem).toHaveBeenCalledWith('student-token', 20);
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('20'));
  });

  it('resolves a Course to its server CartItem before deleting it', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    getCart.mockResolvedValue(serverCart([seoCourse]));
    deleteCartItem.mockResolvedValue(serverCart([]));
    const user = userEvent.setup();
    render(<CartProvider><CartProbe /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('10'));
    await user.click(screen.getByRole('button', { name: 'Remove SEO' }));

    expect(deleteCartItem).toHaveBeenCalledWith('student-token', 100);
    await waitFor(() => expect(screen.getByTestId('header-cart-count')).toHaveTextContent('0'));
  });

  it('loads the next authenticated Students server cart without mixing account state', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'first-token' });
    getCart.mockImplementation((token) => Promise.resolve(token === 'first-token' ? serverCart([seoCourse]) : serverCart([adsCourse])));
    const view = render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('10'));

    useAuth.mockReturnValue({ user: { id: 2, role: 'student' }, token: 'second-token' });
    view.rerender(<CartProvider><CartProbe /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('20'));
    expect(getCart).toHaveBeenLastCalledWith('second-token');
  });

  it('CART-15 ignores legacy authenticated Cart localStorage and clears UI state on logout', async () => {
    localStorage.setItem('seongon-cart:user:1', JSON.stringify([{ courseId: 999, title: 'Stale local course' }]));
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    getCart.mockResolvedValue(serverCart([]));
    const view = render(<CartProvider><CartProbe /></CartProvider>);

    await waitFor(() => expect(getCart).toHaveBeenCalledWith('student-token'));
    expect(screen.getByTestId('cart-course-ids')).toBeEmptyDOMElement();

    useAuth.mockReturnValue({ user: null, token: null });
    view.rerender(<CartProvider><CartProbe /></CartProvider>);

    expect(screen.getByTestId('header-cart-count')).toHaveTextContent('0');
    expect(screen.getByTestId('cart-course-ids')).toBeEmptyDOMElement();
  });

  it('clears the authenticated server cart through DELETE Cart API', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    getCart.mockResolvedValue(serverCart([seoCourse]));
    clearCart.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CartProvider><CartProbe /></CartProvider>);

    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('10'));
    await user.click(screen.getByRole('button', { name: 'Clear cart' }));

    expect(clearCart).toHaveBeenCalledWith('student-token');
    expect(screen.getByTestId('header-cart-count')).toHaveTextContent('0');
  });

  it('keeps Guest cart state empty without creating an anonymous database cart', async () => {
    useAuth.mockReturnValue({ user: null, token: null });

    render(<CartProvider><CartProbe /></CartProvider>);

    expect(screen.getByTestId('header-cart-count')).toHaveTextContent('0');
    expect(getCart).not.toHaveBeenCalled();
    expect(addCartItem).not.toHaveBeenCalled();
  });

  it('ignores a slow mutation response from the previous authenticated Student', async () => {
    const firstUser = { id: 1, role: 'student' };
    const secondUser = { id: 2, role: 'student' };
    let resolveAdd: ((value: ReturnType<typeof serverCart>) => void) | undefined;
    useAuth.mockReturnValue({ user: firstUser, token: 'first-token' });
    getCart.mockImplementation((token) => Promise.resolve(token === 'first-token' ? serverCart([seoCourse]) : serverCart([adsCourse])));
    addCartItem.mockReturnValue(new Promise((resolve) => { resolveAdd = resolve; }));
    const user = userEvent.setup();
    const view = render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('10'));

    await user.click(screen.getByRole('button', { name: 'Add Ads' }));
    useAuth.mockReturnValue({ user: secondUser, token: 'second-token' });
    view.rerender(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('20'));

    resolveAdd?.(serverCart([seoCourse]));

    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('20'));
    expect(screen.getByTestId('cart-course-ids')).not.toHaveTextContent('10');
  });

  it('serializes same-Student mutations so reversed responses cannot restore stale items', async () => {
    let resolveFirst: ((value: ReturnType<typeof serverCart>) => void) | undefined;
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    getCart.mockResolvedValue(serverCart([seoCourse, adsCourse]));
    deleteCartItem.mockImplementation((_: string, itemId: number) => {
      if (itemId === 100) return new Promise((resolve) => { resolveFirst = resolve; });

      return Promise.resolve(serverCart([]));
    });
    const user = userEvent.setup();
    render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('10,20'));

    await user.click(screen.getByRole('button', { name: 'Remove SEO' }));
    await user.click(screen.getByRole('button', { name: 'Remove Ads' }));

    expect(deleteCartItem).toHaveBeenCalledTimes(1);
    expect(deleteCartItem).toHaveBeenNthCalledWith(1, 'student-token', 100);

    resolveFirst?.(serverCart([adsCourse]));

    await waitFor(() => expect(deleteCartItem).toHaveBeenNthCalledWith(2, 'student-token', 101));
    await waitFor(() => expect(screen.getByTestId('header-cart-count')).toHaveTextContent('0'));
  });

  it('keeps the successful first mutation when the next serialized mutation fails', async () => {
    let resolveFirst: ((value: ReturnType<typeof serverCart>) => void) | undefined;
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    getCart.mockResolvedValue(serverCart([seoCourse, adsCourse]));
    deleteCartItem.mockImplementation((_: string, itemId: number) => itemId === 100
      ? new Promise((resolve) => { resolveFirst = resolve; })
      : Promise.reject(new Error('Second mutation failed')));
    const user = userEvent.setup();
    render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('10,20'));

    await user.click(screen.getByRole('button', { name: 'Remove SEO' }));
    await user.click(screen.getByRole('button', { name: 'Remove Ads' }));

    expect(deleteCartItem).toHaveBeenCalledTimes(1);
    resolveFirst?.(serverCart([adsCourse]));
    await waitFor(() => expect(deleteCartItem).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('20'));
    expect(screen.getByTestId('cart-course-ids')).not.toHaveTextContent('10');
  });

  it('ends stale GET loading when a mutation becomes authoritative', async () => {
    let resolveGet: ((value: ReturnType<typeof serverCart>) => void) | undefined;
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    getCart.mockReturnValue(new Promise((resolve) => { resolveGet = resolve; }));
    addCartItem.mockResolvedValue(serverCart([adsCourse]));
    const user = userEvent.setup();
    render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId('cart-loading')).toHaveTextContent('true'));

    await user.click(screen.getByRole('button', { name: 'Add Ads' }));

    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('20'));
    expect(screen.getByTestId('cart-loading')).toHaveTextContent('false');

    resolveGet?.(serverCart([seoCourse]));
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('20'));
  });
});
