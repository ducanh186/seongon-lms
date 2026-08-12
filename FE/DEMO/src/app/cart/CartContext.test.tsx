import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from './CartContext';
import { readCart, writeCart, type CartItem } from './cartStorage';

const useAuth = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({ useAuth }));

const firstUsersCourse: CartItem = {
  courseId: 10,
  slug: 'seo-foundation',
  title: 'SEO Foundation',
  price: '299000',
  thumbnail: null,
};

const secondUsersCourse: CartItem = {
  courseId: 20,
  slug: 'google-ads',
  title: 'Google Ads',
  price: '199000',
  thumbnail: null,
};

function CartProbe({ itemToAdd, itemsToReplace }: { itemToAdd?: CartItem; itemsToReplace?: CartItem[] }) {
  const { add, items, replace } = useCart();
  const didAdd = useRef(false);
  const didReplace = useRef(false);

  useLayoutEffect(() => {
    if (itemToAdd && !didAdd.current) {
      didAdd.current = true;
      add(itemToAdd);
    }
  }, [add, itemToAdd]);

  useLayoutEffect(() => {
    if (itemsToReplace && !didReplace.current) {
      didReplace.current = true;
      replace(itemsToReplace);
    }
  }, [itemsToReplace, replace]);

  return <output data-testid="cart-course-ids">{items.map((item) => item.courseId).join(',')}</output>;
}

describe('CartProvider', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('does not combine a previous students items with the next students mutation during an account switch', async () => {
    writeCart(1, [firstUsersCourse]);
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' } });

    const view = render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('10'));

    useAuth.mockReturnValue({ user: { id: 2, role: 'student' } });
    view.rerender(<CartProvider><CartProbe itemToAdd={secondUsersCourse} /></CartProvider>);

    await waitFor(() => expect(readCart(2)).toEqual([secondUsersCourse]));
    expect(screen.getByTestId('cart-course-ids')).toHaveTextContent('20');
  });

  it('persists authoritative replacement items for the authenticated student only', async () => {
    writeCart(1, [firstUsersCourse]);
    writeCart(2, [secondUsersCourse]);
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' } });
    const refreshedCourse = { ...firstUsersCourse, title: 'SEO Foundation 2026', price: '399000' };

    render(<CartProvider><CartProbe itemsToReplace={[refreshedCourse]} /></CartProvider>);

    await waitFor(() => expect(readCart(1)).toEqual([refreshedCourse]));
    expect(readCart(2)).toEqual([secondUsersCourse]);
  });
});
