import { ENTITY_REGISTRY, type DomainEntityKey, type DomainEntityStatus } from '../domain/entityRegistry';

export type AdminSection =
  | 'overview'
  | 'roles'
  | 'users'
  | 'carts'
  | 'cartItems'
  | 'orders'
  | 'paymentSettings'
  | 'categories'
  | 'courseCategories'
  | 'courses'
  | 'lessons'
  | 'enrollments'
  | 'learningProgress'
  | 'quizzes'
  | 'questions'
  | 'answers'
  | 'quizAttempts'
  | 'certificates'
  | 'reviews'
  | 'news';

export type AdminNavigationItem = {
  section: AdminSection;
  label: string;
  entity?: DomainEntityKey;
  status?: DomainEntityStatus;
};

export type AdminNavigationGroup = {
  key: 'navigation';
  label: string;
  items: readonly AdminNavigationItem[];
};

const domainItem = (section: AdminSection, label: string, entity: DomainEntityKey): AdminNavigationItem => ({
  section,
  label,
  entity,
  status: ENTITY_REGISTRY[entity].status,
});

export const ADMIN_NAVIGATION: readonly AdminNavigationGroup[] = [
  {
    key: 'navigation',
    label: 'Điều hướng',
    items: [
      { section: 'overview', label: 'Tổng quan' },
      domainItem('users', 'Tài khoản', 'users'),
      domainItem('orders', 'Đơn hàng', 'orders'),
      { section: 'paymentSettings', label: 'Cài đặt thanh toán' },
      domainItem('categories', 'Danh mục', 'categories'),
      domainItem('courses', 'Khóa học', 'courses'),
      domainItem('reviews', 'Đánh giá', 'reviews'),
      domainItem('news', 'Tin tức', 'newsPosts'),
    ],
  },
] as const;

export function getAdminNavigationItems(): AdminNavigationItem[] {
  return ADMIN_NAVIGATION.flatMap((group) => [...group.items]);
}
