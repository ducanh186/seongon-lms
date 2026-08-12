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
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isCartItem)) {
      localStorage.removeItem(key);
      return [];
    }

    return uniqueByCourseId(parsed);
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

export function writeCart(userId: number, items: CartItem[]): void {
  localStorage.setItem(cartKey(userId), JSON.stringify(uniqueByCourseId(items)));
}
