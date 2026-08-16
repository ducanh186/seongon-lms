import type { DomainEntityKey } from '../domain/entityRegistry';

export type AdminSection =
  | 'overview'
  | 'users'
  | 'categories'
  | 'courses'
  | 'lessons'
  | 'quizzes'
  | 'enrollments'
  | 'quizAttempts'
  | 'certificates'
  | 'reviews'
  | 'news';

export type AdminNavigationItem = {
  section: AdminSection;
  label: string;
  entity?: DomainEntityKey;
  status?: 'ERD_PENDING';
};

export type AdminNavigationGroup = {
  key: 'dashboard' | 'content' | 'learning' | 'website';
  label: string;
  items: readonly AdminNavigationItem[];
};

const domainItem = (section: AdminSection, label: string, entity: DomainEntityKey): AdminNavigationItem => ({
  section,
  label,
  entity,
  status: 'ERD_PENDING',
});

// ERD_PENDING: Reorder, rename, add, or remove entity items here after the approved ERD arrives.
export const ADMIN_NAVIGATION: readonly AdminNavigationGroup[] = [
  { key: 'dashboard', label: 'Dashboard', items: [{ section: 'overview', label: 'Tổng quan' }] },
  {
    key: 'content', label: 'Nội dung', items: [
      domainItem('courses', 'Khóa học', 'courses'),
      domainItem('categories', 'Danh mục', 'categories'),
      domainItem('lessons', 'Bài học', 'lessons'),
      domainItem('quizzes', 'Bài kiểm tra', 'quizzes'),
    ],
  },
  {
    key: 'learning', label: 'Học tập', items: [
      domainItem('users', 'Học viên', 'users'),
      domainItem('enrollments', 'Ghi danh', 'enrollments'),
      domainItem('quizAttempts', 'Kết quả bài kiểm tra', 'quizAttempts'),
      domainItem('certificates', 'Chứng chỉ', 'certificates'),
      domainItem('reviews', 'Đánh giá', 'reviews'),
    ],
  },
  { key: 'website', label: 'Website', items: [domainItem('news', 'Tin tức', 'newsPosts')] },
] as const;

export function getAdminNavigationItems(): AdminNavigationItem[] {
  return ADMIN_NAVIGATION.flatMap((group) => [...group.items]);
}
