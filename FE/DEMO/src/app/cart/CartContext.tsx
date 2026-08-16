import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { localStorageAdapter } from '../data/adapters/LocalStorageAdapter';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import { ApiError } from '../lib/api';
import type { ApiCart } from '../lib/contracts';
import type { CartItem } from './cartTypes';

interface CartContextType {
  items: CartItem[];
  count: number;
  loading: boolean;
  error: string | null;
  add: (courseId: number) => Promise<void>;
  remove: (courseId: number) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
  contains: (courseId: number) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function mapCart(cart: ApiCart): CartItem[] {
  return cart.items.map(({ id, course }) => ({
    id,
    courseId: course.id,
    slug: course.slug,
    title: course.title,
    price: course.price,
    thumbnail: course.thumbnail,
  }));
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Không thể tải giỏ hàng. Vui lòng thử lại.';
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  const isStudent = user?.role === 'student' && Boolean(token);
  const authIdentity = isStudent ? `${user.id}:${token}` : 'anonymous';
  const authIdentityRef = useRef(authIdentity);

  if (authIdentityRef.current !== authIdentity) {
    authIdentityRef.current = authIdentity;
    requestId.current += 1;
  }

  const enqueueMutation = useCallback((operation: (operationIdentity: string) => Promise<void>): Promise<void> => {
    const operationIdentity = authIdentity;
    requestId.current += 1;
    setLoading(false);
    const task = mutationQueue.current
      .then(() => operation(operationIdentity))
      .finally(() => {
        if (authIdentityRef.current === operationIdentity) {
          requestId.current += 1;
          setLoading(false);
        }
      });
    mutationQueue.current = task.catch(() => undefined);

    return task;
  }, [authIdentity]);

  const refresh = useCallback(async (): Promise<void> => {
    const currentRequest = ++requestId.current;
    const requestIdentity = authIdentity;
    if (!isStudent || !token) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await applicationRepositories.cart.get(token);
      if (authIdentityRef.current === requestIdentity && requestId.current === currentRequest) {
        setItems(mapCart(data));
      }
    } catch (caught) {
      if (authIdentityRef.current === requestIdentity && requestId.current === currentRequest) {
        setError(errorMessage(caught));
      }
      throw caught;
    } finally {
      if (authIdentityRef.current === requestIdentity && requestId.current === currentRequest) {
        setLoading(false);
      }
    }
  }, [authIdentity, isStudent, token]);

  useEffect(() => {
    setItems([]);
    setError(null);
    if (!isStudent || !token || !user) {
      requestId.current += 1;
      setLoading(false);
      return;
    }

    // Compatibility cleanup only: the obsolete cart snapshot is never read.
    localStorageAdapter.remove(`seongon-cart:user:${user.id}`);
    void refresh().catch(() => undefined);
  }, [isStudent, refresh, token, user]);

  const requireStudentToken = () => {
    if (!isStudent || !token) throw new Error('Authentication required');
    return token;
  };

  const value = useMemo<CartContextType>(() => ({
    items,
    count: items.length,
    loading,
    error,
    add: async (courseId) => {
      const studentToken = requireStudentToken();
      return enqueueMutation(async (operationIdentity) => {
        setError(null);
        try {
          const { data } = await applicationRepositories.cart.add(studentToken, courseId);
          if (authIdentityRef.current === operationIdentity) setItems(mapCart(data));
        } catch (caught) {
          if (authIdentityRef.current === operationIdentity) setError(errorMessage(caught));
          throw caught;
        }
      });
    },
    remove: async (courseId) => {
      const studentToken = requireStudentToken();
      const item = items.find((candidate) => candidate.courseId === courseId);
      if (!item) return;
      return enqueueMutation(async (operationIdentity) => {
        setError(null);
        try {
          const { data } = await applicationRepositories.cart.remove(studentToken, item.id);
          if (authIdentityRef.current === operationIdentity) setItems(mapCart(data));
        } catch (caught) {
          if (authIdentityRef.current === operationIdentity) setError(errorMessage(caught));
          throw caught;
        }
      });
    },
    clear: async () => {
      const studentToken = requireStudentToken();
      return enqueueMutation(async (operationIdentity) => {
        setError(null);
        try {
          await applicationRepositories.cart.clear(studentToken);
          if (authIdentityRef.current === operationIdentity) setItems([]);
        } catch (caught) {
          if (authIdentityRef.current === operationIdentity) setError(errorMessage(caught));
          throw caught;
        }
      });
    },
    refresh,
    contains: (courseId) => items.some((item) => item.courseId === courseId),
  }), [enqueueMutation, error, isStudent, items, loading, refresh, token]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
