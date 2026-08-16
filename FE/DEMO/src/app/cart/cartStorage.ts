export type CartItem = {
  courseId: number;
  slug: string;
  title: string;
  price: string;
  thumbnail: string | null;
};

function cartKey(userId: number): string {
  return `seongon-cart:user:${userId}`;
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;

  const item = value as Partial<CartItem>;
  return Number.isInteger(item.courseId)
    && typeof item.slug === 'string'
    && typeof item.title === 'string'
    && typeof item.price === 'string'
    && item.price.trim() !== ''
    && Number.isFinite(Number(item.price))
    && (typeof item.thumbnail === 'string' || item.thumbnail === null);
}

function uniqueByCourseId(items: CartItem[]): CartItem[] {
  const courseIds = new Set<number>();
  return items.filter((item) => {
    if (courseIds.has(item.courseId)) return false;
    courseIds.add(item.courseId);
    return true;
  });
}

export function readCart(userId: number): CartItem[] {
  const key = cartKey(userId);
  const parsed = localStorageAdapter.read<unknown>(key);
  if (!Array.isArray(parsed) || !parsed.every(isCartItem)) {
    if (parsed !== null) localStorageAdapter.remove(key);
    return [];
  }

  return uniqueByCourseId(parsed);
}

export function writeCart(userId: number, items: CartItem[]): void {
  localStorageAdapter.write(cartKey(userId), uniqueByCourseId(items));
}
import { localStorageAdapter } from '../data/adapters/LocalStorageAdapter';
