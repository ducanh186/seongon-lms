// ERD_PENDING:
// The API contract adapter will be reconciled after the approved ERD and backend schema are available.
// Existing production requests continue to use the current Laravel API client; no endpoint is invented here.
export interface FutureApiAdapter {
  get<T>(resource: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(resource: string, payload: unknown): Promise<T>;
}

export class ApiAdapterPlaceholder implements FutureApiAdapter {
  async get<T>(_resource: string, _params?: Record<string, unknown>): Promise<T> {
    throw new Error('ERD/API contract not implemented yet');
  }

  async post<T>(_resource: string, _payload: unknown): Promise<T> {
    throw new Error('ERD/API contract not implemented yet');
  }
}
