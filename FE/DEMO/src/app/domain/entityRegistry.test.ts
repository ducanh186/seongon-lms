import { describe, expect, it } from 'vitest';
import { ENTITY_REGISTRY, getAdminEntities } from './entityRegistry';

describe('temporary entity registry', () => {
  it('marks every current domain object as ERD_PENDING', () => {
    expect(Object.values(ENTITY_REGISTRY)).not.toHaveLength(0);
    expect(Object.values(ENTITY_REGISTRY).every((entity) => entity.status === 'ERD_PENDING')).toBe(true);
  });

  it('uses current domain names without claiming final database mappings', () => {
    expect(Object.keys(ENTITY_REGISTRY)).toEqual([
      'users', 'courses', 'categories', 'lessons', 'enrollments', 'reviews',
      'quizzes', 'quizAttempts', 'certificates', 'orders', 'newsPosts',
    ]);
    expect(getAdminEntities().every((entity) => entity.adminVisible)).toBe(true);
  });
});
