import { ENTITY_REGISTRY, type DomainEntityKey, type DomainEntityStatus } from '../domain/entityRegistry';

export type AdminSection =
  | 'overview'
  | 'roles'
  | 'users'
  | 'carts'
  | 'cartItems'
  | 'orders'
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
  key: 'dashboard' | 'accounts' | 'commerce' | 'courseManagement' | 'learning' | 'assessment' | 'extended';
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
  { key: 'dashboard', label: 'Dashboard', items: [{ section: 'overview', label: 'Tổng quan' }] },
  {
    key: 'accounts',
    label: 'Tài khoản',
    items: [
      domainItem('roles', 'Vai trò', 'roles'),
      domainItem('users', 'Học viên', 'users'),
    ],
  },
  {
    key: 'commerce',
    label: 'Thương mại',
    items: [
      domainItem('carts', 'Giỏ hàng', 'carts'),
      domainItem('cartItems', 'Mục giỏ hàng', 'cartItems'),
      domainItem('orders', 'Đơn hàng', 'orders'),
    ],
  },
  {
    key: 'courseManagement',
    label: 'Quản lý khóa học',
    items: [
      domainItem('categories', 'Danh mục', 'categories'),
      domainItem('courseCategories', 'Gán danh mục', 'courseCategories'),
      domainItem('courses', 'Khóa học', 'courses'),
      domainItem('lessons', 'Bài học', 'lessons'),
    ],
  },
  {
    key: 'learning',
    label: 'Học tập',
    items: [
      domainItem('enrollments', 'Ghi danh', 'enrollments'),
      domainItem('learningProgress', 'Tiến độ học tập', 'learningProgress'),
    ],
  },
  {
    key: 'assessment',
    label: 'Kiểm tra',
    items: [
      domainItem('quizzes', 'Bài kiểm tra', 'exams'),
      domainItem('questions', 'Câu hỏi', 'questions'),
      domainItem('answers', 'Đáp án', 'answers'),
      domainItem('quizAttempts', 'Kết quả bài kiểm tra', 'attempts'),
    ],
  },
  {
    key: 'extended',
    label: 'Mở rộng',
    items: [
      domainItem('certificates', 'Chứng chỉ', 'certificates'),
      domainItem('reviews', 'Đánh giá', 'reviews'),
      domainItem('news', 'Tin tức', 'newsPosts'),
    ],
  },
] as const;

export function getAdminNavigationItems(): AdminNavigationItem[] {
  return ADMIN_NAVIGATION.flatMap((group) => [...group.items]);
}
