import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { readCart, type CartItem, writeCart } from './cartStorage';

type CartContextValue = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (courseId: number) => void;
  replace: (items: CartItem[]) => void;
  count: number;
  contains: (courseId: number) => boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

type CartState = {
  userId: number | null;
  items: CartItem[];
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.role === 'student' ? user.id : null;
  const [cart, setCart] = useState<CartState>({ userId: null, items: [] });

  useEffect(() => {
    setCart({ userId, items: userId === null ? [] : readCart(userId) });
  }, [userId]);

  const updateCart = useCallback((update: (items: CartItem[]) => CartItem[]) => {
    if (userId === null) return;

    setCart((currentCart) => {
      const currentItems = currentCart.userId === userId ? currentCart.items : readCart(userId);
      const nextItems = update(currentItems);
      writeCart(userId, nextItems);
      return { userId, items: nextItems };
    });
  }, [userId]);

  const items = cart.userId === userId ? cart.items : [];

  const value = useMemo<CartContextValue>(() => ({
    items,
    add: (item) => {
      updateCart((currentItems) => (
        currentItems.some(({ courseId }) => courseId === item.courseId)
          ? currentItems
          : [...currentItems, item]
      ));
    },
    remove: (courseId) => {
      updateCart((currentItems) => currentItems.filter((item) => item.courseId !== courseId));
    },
    replace: (nextItems) => {
      updateCart(() => nextItems);
    },
    count: items.length,
    contains: (courseId) => items.some((item) => item.courseId === courseId),
  }), [items, updateCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
