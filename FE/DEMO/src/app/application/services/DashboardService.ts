import type { DashboardPeriod } from '../../lib/contracts';
import type { DashboardRepository } from '../../data/repositories/adminRepositories';

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  getOverview(token: string, period: DashboardPeriod = 'all') {
    // Only forward `period` when it narrows the query; keeps the call shape
    // identical to the pre-existing single-argument `getStats(token)` call.
    return period === 'all' ? this.repository.getStats(token) : this.repository.getStats(token, period);
  }
}
