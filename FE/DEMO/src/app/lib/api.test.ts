import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, apiRequest } from './api';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends JSON and the supplied Sanctum bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 1, name: 'SEO' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest<{ data: { id: number; name: string }[] }>('/categories', {
      token: 'sanctum-token',
    });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/categories$/);
    expect(request.headers).toBeInstanceOf(Headers);
    expect((request.headers as Headers).get('Accept')).toBe('application/json');
    expect((request.headers as Headers).get('Authorization')).toBe('Bearer sanctum-token');
  });

  it('uses the native Laravel API origin on a fresh checkout without a local env override', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const configuredOrigin = import.meta.env.VITE_API_BASE_URL;

    try {
      delete import.meta.env.VITE_API_BASE_URL;
      vi.resetModules();
      const { api: freshCheckoutApi } = await import('./api');

      await freshCheckoutApi.categories();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/v1/categories',
        expect.any(Object),
      );
    } finally {
      if (configuredOrigin === undefined) {
        delete import.meta.env.VITE_API_BASE_URL;
      } else {
        import.meta.env.VITE_API_BASE_URL = configuredOrigin;
      }
    }
  });

  it('maps a Laravel validation response into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'The email field is required.',
            errors: { email: ['The email field is required.'] },
          }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(apiRequest('/auth/login', { method: 'POST', body: { email: '' } })).rejects.toMatchObject<Partial<ApiError>>({
      name: 'ApiError',
      status: 422,
      fields: { email: ['The email field is required.'] },
    });
  });

  it('downloads a certificate Blob with the supplied bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('pdf-bytes', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const certificate = await api.downloadCertificate('student-token', 42);
    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/my/courses/42/certificate`,
      { headers: { Authorization: 'Bearer student-token' } },
    );
    expect(certificate.type).toBe('application/pdf');
    expect(await certificate.text()).toBe('pdf-bytes');
  });

  it('maps a rejected certificate download into an ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(api.downloadCertificate('student-token', 42)).rejects.toMatchObject<Partial<ApiError>>({
      name: 'ApiError',
      message: 'Không thể tải chứng chỉ.',
      status: 404,
    });
  });

  it('sends lesson order and question replacement through the matching admin routes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 18, content: 'Cau hoi moi', options: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await api.reorderLessons('admin-token', 41, [7, 9]);
    await api.updateQuestion('admin-token', 18, {
      content: 'Cau hoi moi',
      options: [{ content: 'Dung', is_correct: true }, { content: 'Sai', is_correct: false }],
    });

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/courses\/41\/lessons\/reorder$/);
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ order: [7, 9] }));
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/admin\/questions\/18$/);
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
  });
});
