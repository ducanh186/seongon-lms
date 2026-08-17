import { describe, expect, it } from 'vitest';
import { CORE_ERD_ENTITY_KEYS, ENTITY_REGISTRY, getAdminEntities } from './entityRegistry';

describe('entity registry', () => {
  it('marks operational indexes as live or intentionally read-only', () => {
    expect(Object.values(ENTITY_REGISTRY)).not.toHaveLength(0);
    expect(ENTITY_REGISTRY.lessons.status).toBe('live');
    expect(ENTITY_REGISTRY.exams.status).toBe('live');
    expect(ENTITY_REGISTRY.enrollments.status).toBe('read_only');
    expect(ENTITY_REGISTRY.attempts.status).toBe('read_only');
    expect(ENTITY_REGISTRY.certificates.status).toBe('read_only');
  });

  it('contains every approved core ERD object exactly once', () => {
    expect(CORE_ERD_ENTITY_KEYS).toEqual([
      'roles', 'users', 'carts', 'cartItems', 'orders',
      'categories', 'courseCategories', 'courses', 'enrollments',
      'exams', 'questions', 'answers', 'learningProgress', 'attempts', 'lessons',
    ]);
    expect(new Set(CORE_ERD_ENTITY_KEYS).size).toBe(15);
    expect(CORE_ERD_ENTITY_KEYS.every((key) => ENTITY_REGISTRY[key].adminVisible)).toBe(true);
    expect(getAdminEntities().every((entity) => entity.adminVisible)).toBe(true);
  });
});
