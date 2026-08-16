// TEMPORARY DOMAIN REGISTRY.
// ERD_PENDING: Replace or reconcile this metadata with the customer's approved ERD.
// Do not treat this registry as the final database schema.

export type DomainEntityKey =
  | 'users'
  | 'courses'
  | 'categories'
  | 'lessons'
  | 'enrollments'
  | 'reviews'
  | 'quizzes'
  | 'quizAttempts'
  | 'certificates'
  | 'orders'
  | 'newsPosts';

export type TemporaryEntityDefinition = {
  key: DomainEntityKey;
  label: string;
  adminVisible: boolean;
  status: 'ERD_PENDING';
};

function entity(key: DomainEntityKey, label: string): TemporaryEntityDefinition {
  return { key, label, adminVisible: true, status: 'ERD_PENDING' };
}

export const ENTITY_REGISTRY: Record<DomainEntityKey, TemporaryEntityDefinition> = {
  users: entity('users', 'Học viên'),
  courses: entity('courses', 'Khóa học'),
  categories: entity('categories', 'Danh mục'),
  lessons: entity('lessons', 'Bài học'),
  enrollments: entity('enrollments', 'Ghi danh'),
  reviews: entity('reviews', 'Đánh giá'),
  quizzes: entity('quizzes', 'Bài kiểm tra'),
  quizAttempts: entity('quizAttempts', 'Kết quả bài kiểm tra'),
  certificates: entity('certificates', 'Chứng chỉ'),
  orders: entity('orders', 'Đơn hàng'),
  newsPosts: entity('newsPosts', 'Tin tức'),
};

export function getAdminEntities(): TemporaryEntityDefinition[] {
  return Object.values(ENTITY_REGISTRY).filter((entityDefinition) => entityDefinition.adminVisible);
}
