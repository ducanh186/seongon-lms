// UI registry aligned with the approved domain model. Laravel migrations remain
// authoritative for physical database details.

export const CORE_ERD_ENTITY_KEYS = [
  'roles',
  'users',
  'carts',
  'cartItems',
  'orders',
  'categories',
  'courseCategories',
  'courses',
  'enrollments',
  'exams',
  'questions',
  'answers',
  'learningProgress',
  'attempts',
  'lessons',
] as const;

export type CoreErdEntityKey = typeof CORE_ERD_ENTITY_KEYS[number];

export type DomainEntityKey =
  | CoreErdEntityKey
  | 'reviews'
  | 'certificates'
  | 'newsPosts';

export type DomainEntityStatus = 'live' | 'read_only';

export type EntityDefinition = {
  key: DomainEntityKey;
  label: string;
  adminVisible: boolean;
  status: DomainEntityStatus;
};

function entity(key: DomainEntityKey, label: string, status: DomainEntityStatus = 'live'): EntityDefinition {
  return { key, label, adminVisible: true, status };
}

export const ENTITY_REGISTRY: Record<DomainEntityKey, EntityDefinition> = {
  roles: entity('roles', 'Vai trò', 'read_only'),
  users: entity('users', 'Học viên'),
  carts: entity('carts', 'Giỏ hàng', 'read_only'),
  cartItems: entity('cartItems', 'Mục giỏ hàng', 'read_only'),
  orders: entity('orders', 'Đơn hàng', 'read_only'),
  categories: entity('categories', 'Danh mục'),
  courseCategories: entity('courseCategories', 'Gán danh mục', 'read_only'),
  courses: entity('courses', 'Khóa học'),
  enrollments: entity('enrollments', 'Ghi danh', 'read_only'),
  exams: entity('exams', 'Bài kiểm tra'),
  questions: entity('questions', 'Câu hỏi', 'read_only'),
  answers: entity('answers', 'Đáp án', 'read_only'),
  learningProgress: entity('learningProgress', 'Tiến độ học tập', 'read_only'),
  attempts: entity('attempts', 'Kết quả bài kiểm tra', 'read_only'),
  lessons: entity('lessons', 'Bài học'),
  reviews: entity('reviews', 'Đánh giá'),
  certificates: entity('certificates', 'Chứng chỉ', 'read_only'),
  newsPosts: entity('newsPosts', 'Tin tức'),
};

export function getAdminEntities(): EntityDefinition[] {
  return Object.values(ENTITY_REGISTRY).filter((entityDefinition) => entityDefinition.adminVisible);
}
