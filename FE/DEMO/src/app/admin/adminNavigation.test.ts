import { describe, expect, it } from 'vitest';
import { ADMIN_NAVIGATION, getAdminNavigationItems } from './adminNavigation';
import { CORE_ERD_ENTITY_KEYS } from '../domain/entityRegistry';

describe('Admin navigation configuration', () => {
  it('keeps a flat task-oriented navigation while preserving the domain registry', () => {
    expect(ADMIN_NAVIGATION.map((group) => group.label)).toEqual(['Điều hướng']);
    expect(getAdminNavigationItems().map((item) => item.label)).toEqual([
      'Tổng quan', 'Tài khoản', 'Đơn hàng',
      'Danh mục', 'Khóa học', 'Tin tức',
    ]);

    expect(CORE_ERD_ENTITY_KEYS).toHaveLength(15);
    expect(getAdminNavigationItems().some((item) => item.section === 'roles')).toBe(false);
    expect(getAdminNavigationItems().some((item) => item.section === 'carts')).toBe(false);
    expect(getAdminNavigationItems().some((item) => item.section === 'cartItems')).toBe(false);
    expect(getAdminNavigationItems().some((item) => item.section === 'courseCategories')).toBe(false);
  });

  it('marks monitoring-only entities as read-only and other entities as live', () => {
    const items = getAdminNavigationItems();
    expect(items.find((item) => item.section === 'orders')?.status).toBe('read_only');
    expect(items.find((item) => item.section === 'courses')?.status).toBe('live');
  });
});
