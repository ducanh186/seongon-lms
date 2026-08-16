import { describe, expect, it } from 'vitest';
import { ADMIN_NAVIGATION, getAdminNavigationItems } from './adminNavigation';

describe('Admin navigation configuration', () => {
  it('keeps the temporary ERD mapping in configurable groups', () => {
    expect(ADMIN_NAVIGATION.map((group) => group.label)).toEqual([
      'Dashboard', 'Nội dung', 'Học tập', 'Website',
    ]);
    expect(getAdminNavigationItems().map((item) => item.label)).toEqual([
      'Tổng quan', 'Khóa học', 'Danh mục', 'Bài học', 'Bài kiểm tra',
      'Học viên', 'Ghi danh', 'Kết quả bài kiểm tra', 'Chứng chỉ', 'Đánh giá', 'Tin tức',
    ]);
  });

  it('marks entity-backed navigation as ERD_PENDING', () => {
    expect(getAdminNavigationItems().filter((item) => item.entity).every((item) => item.status === 'ERD_PENDING')).toBe(true);
  });
});
