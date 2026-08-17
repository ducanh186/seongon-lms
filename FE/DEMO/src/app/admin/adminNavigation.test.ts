import { describe, expect, it } from 'vitest';
import { ADMIN_NAVIGATION, getAdminNavigationItems } from './adminNavigation';
import { CORE_ERD_ENTITY_KEYS } from '../domain/entityRegistry';

describe('Admin navigation configuration', () => {
  it('keeps the approved domain mapping in configurable groups', () => {
    expect(ADMIN_NAVIGATION.map((group) => group.label)).toEqual([
      'Dashboard', 'Tài khoản', 'Thương mại', 'Quản lý khóa học', 'Học tập', 'Kiểm tra', 'Mở rộng',
    ]);
    expect(getAdminNavigationItems().map((item) => item.label)).toEqual([
      'Tổng quan', 'Vai trò', 'Học viên', 'Giỏ hàng', 'Mục giỏ hàng', 'Đơn hàng',
      'Danh mục', 'Gán danh mục', 'Khóa học', 'Bài học',
      'Ghi danh', 'Tiến độ học tập',
      'Bài kiểm tra', 'Câu hỏi', 'Đáp án', 'Kết quả bài kiểm tra',
      'Chứng chỉ', 'Đánh giá', 'Tin tức',
    ]);

    const coreEntities = getAdminNavigationItems()
      .map((item) => item.entity)
      .filter((entity): entity is typeof CORE_ERD_ENTITY_KEYS[number] =>
        Boolean(entity) && CORE_ERD_ENTITY_KEYS.includes(entity as typeof CORE_ERD_ENTITY_KEYS[number]));

    expect(new Set(coreEntities)).toEqual(new Set(CORE_ERD_ENTITY_KEYS));
    expect(coreEntities).toHaveLength(15);
  });

  it('marks monitoring-only entities as read-only and other entities as live', () => {
    const items = getAdminNavigationItems();
    expect(items.find((item) => item.section === 'lessons')?.status).toBe('live');
    expect(items.find((item) => item.section === 'roles')?.status).toBe('read_only');
    expect(items.find((item) => item.section === 'orders')?.status).toBe('read_only');
    expect(items.find((item) => item.section === 'enrollments')?.status).toBe('read_only');
    expect(items.find((item) => item.section === 'quizAttempts')?.status).toBe('read_only');
    expect(items.find((item) => item.section === 'certificates')?.status).toBe('read_only');
  });
});
