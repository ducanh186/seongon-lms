import { describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { applicationRepositories } from './applicationRepositories';

vi.mock('../../lib/api', () => ({
  api: {
    categories: vi.fn(),
    myCourses: vi.fn(),
  },
}));

describe('application repositories', () => {
  it('routes catalog reads through the catalog repository', async () => {
    vi.mocked(api.categories).mockResolvedValue({ data: [] });
    await applicationRepositories.catalog.listCategories();
    expect(api.categories).toHaveBeenCalledOnce();
  });

  it('routes student learning reads through the learning repository', async () => {
    vi.mocked(api.myCourses).mockResolvedValue({ data: [] } as never);
    await applicationRepositories.learning.listMyCourses('token');
    expect(api.myCourses).toHaveBeenCalledWith('token');
  });
});
