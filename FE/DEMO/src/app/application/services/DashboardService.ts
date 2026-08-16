import type { DashboardRepository } from '../../data/repositories/adminRepositories';

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  getOverview(token: string) {
    return this.repository.getStats(token);
  }
}
