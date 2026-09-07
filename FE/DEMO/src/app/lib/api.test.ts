import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, apiRequest, resolveMaterialUrl } from './api';

describe('apiRequest', () => {
  it('resolves stored PDF paths against the API host, not the frontend host', () => {
    const origin = new URL(import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1', window.location.origin).origin;
    expect(resolveMaterialUrl('/storage/lesson-materials/guide.pdf')).toBe(`${origin}/storage/lesson-materials/guide.pdf`);
    expect(resolveMaterialUrl('https://cdn.example.test/guide.pdf')).toBe('https://cdn.example.test/guide.pdf');
    expect(resolveMaterialUrl('javascript:alert(1)')).toBeUndefined();
  });
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
    const certificateBlob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    const responseBlob = vi.fn().mockResolvedValue(certificateBlob);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: responseBlob,
    });
    vi.stubGlobal('fetch', fetchMock);

    const certificate = await api.downloadCertificate('student-token', 42);
    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/my/courses/42/certificate`,
      { headers: { Authorization: 'Bearer student-token' } },
    );
    expect(responseBlob).toHaveBeenCalledOnce();
    expect(certificate).toBe(certificateBlob);
    expect(certificate.type).toBe('application/pdf');
  });

  it('sends lesson material as FormData without forcing a JSON content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 9, material_url: '/storage/lesson-materials/guide.pdf' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const body = new FormData();
    body.append('title', 'Lesson with PDF');
    body.append('material', new File(['pdf'], 'guide.pdf', { type: 'application/pdf' }));

    await api.saveLesson('admin-token', body, 41);

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/courses\/41\/lessons$/);
    expect(request.body).toBe(body);
    expect((request.headers as Headers).get('Content-Type')).toBeNull();
    expect((request.headers as Headers).get('Authorization')).toBe('Bearer admin-token');
  });

  it('uses Laravel method spoofing when updating a Lesson with multipart data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 9, material_url: '/storage/lesson-materials/guide.pdf' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const body = new FormData();
    body.append('title', 'Updated Lesson');
    body.append('material', new File(['pdf'], 'guide.pdf', { type: 'application/pdf' }));

    await api.saveLesson('admin-token', body, 41, 9);

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/lessons\/9$/);
    expect(request.method).toBe('POST');
    expect((request.body as FormData).get('_method')).toBe('PUT');
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

  it('maps every new ERD read to its exact Admin endpoint', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));
    vi.stubGlobal('fetch', fetchMock);

    await api.adminRoles('token', { q: 'student', page: 1 });
    await api.adminCarts('token', { state: 'non_empty', page: 1 });
    await api.adminCartItems('token', { course_id: 10, page: 1 });
    await api.adminOrders('token', { status: 'paid', page: 1 });
    await api.adminCourseCategories('token', { course_id: 10, page: 1 });
    await api.adminLearningProgress('token', { completed: 1, page: 1 });
    await api.adminQuestions('token', { exam_id: 3, page: 1 });
    await api.adminAnswers('token', { correct: 1, page: 1 });

    expect(fetchMock.mock.calls.map(([url]) => String(url).replace(/^.*\/api\/v1/, ''))).toEqual([
      '/admin/roles?q=student&page=1',
      '/admin/carts?state=non_empty&page=1',
      '/admin/cart-items?course_id=10&page=1',
      '/admin/orders?status=paid&page=1',
      '/admin/course-categories?course_id=10&page=1',
      '/admin/learning-progress?completed=1&page=1',
      '/admin/questions?exam_id=3&page=1',
      '/admin/answers?correct=1&page=1',
    ]);
  });
});
