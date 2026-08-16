import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { adminRepositories } from './adminRepositories';
import { DashboardService } from '../../application/services/DashboardService';

vi.mock('../../lib/api', () => ({
  api: {
    adminStats: vi.fn(),
    adminUsers: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

describe('admin repositories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps dashboard retrieval behind a service and repository boundary', async () => {
    vi.mocked(api.adminStats).mockResolvedValue({ students: 7 } as never);
    const service = new DashboardService(adminRepositories.dashboard);

    await expect(service.getOverview('token')).resolves.toEqual({ students: 7 });
    expect(api.adminStats).toHaveBeenCalledWith('token');
  });

  it('keeps user data operations behind the users repository', async () => {
    vi.mocked(api.adminUsers).mockResolvedValue({ data: [] } as never);

    await adminRepositories.users.list('token', { q: 'An' });

    expect(api.adminUsers).toHaveBeenCalledWith('token', { q: 'An' });
  });
});
