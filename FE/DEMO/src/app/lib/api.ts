import type {
  ApiCategory,
  ApiCertificate,
  ApiCourse,
  ApiEnrollment,
  ApiLesson,
  ApiOrder,
  ApiProgress,
  ApiQuiz,
  ApiQuizAttempt,
  ApiReview,
  ApiUser,
  Paginated,
} from './contracts';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers: suppliedHeaders, token, ...requestOptions } = options;
  const headers = new Headers(suppliedHeaders);
  headers.set('Accept', 'application/json');

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? 'Không thể kết nối với hệ thống. Vui lòng thử lại.',
      response.status,
      payload?.errors ?? {},
    );
  }

  return payload as T;
}

function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  register: (body: { name: string; email: string; password: string; password_confirmation: string }) =>
    apiRequest<{ user: ApiUser; token: string }>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    apiRequest<{ user: ApiUser; token: string }>('/auth/login', { method: 'POST', body }),
  logout: (token: string) => apiRequest<void>('/auth/logout', { method: 'POST', token }),
  me: (token: string) => apiRequest<{ data: ApiUser }>('/auth/me', { token }),
  updateProfile: (token: string, body: Pick<ApiUser, 'name' | 'phone' | 'avatar'>) =>
    apiRequest<{ data: ApiUser }>('/auth/profile', { method: 'PUT', token, body }),
  updatePassword: (token: string, body: Record<string, string>) =>
    apiRequest<void>('/auth/password', { method: 'PUT', token, body }),

  categories: () => apiRequest<{ data: ApiCategory[] }>('/categories'),
  courses: (filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiCourse>>(`/courses${queryString(filters)}`),
  course: (slug: string) => apiRequest<{ data: ApiCourse }>(`/courses/${slug}`),
  reviews: (slug: string, page?: number) => apiRequest<Paginated<ApiReview>>(`/courses/${slug}/reviews${queryString({ page })}`),

  createOrder: (token: string, courseId: number) =>
    apiRequest<{ data: ApiOrder }>('/orders', { method: 'POST', token, body: { course_id: courseId } }),
  payOrder: (token: string, orderId: number, paymentMethod: 'card' | 'qr', outcome: 'success' | 'failure' = 'success') =>
    apiRequest<{ message: string; order: ApiOrder; enrollment?: ApiEnrollment }>(`/orders/${orderId}/pay`, {
      method: 'POST',
      token,
      body: { payment_method: paymentMethod, outcome },
    }),
  myCourses: (token: string, page?: number) => apiRequest<Paginated<ApiEnrollment>>(`/my/courses${queryString({ page })}`, { token }),
  lessons: (token: string, courseId: number) => apiRequest<{ data: ApiLesson[] }>(`/my/courses/${courseId}/lessons`, { token }),
  progress: (token: string, courseId: number) => apiRequest<ApiProgress>(`/my/courses/${courseId}/progress`, { token }),
  completeLesson: (token: string, lessonId: number) => apiRequest<ApiProgress>(`/my/lessons/${lessonId}/complete`, { method: 'POST', token }),
  quiz: (token: string, courseId: number) => apiRequest<{ data: ApiQuiz }>(`/my/courses/${courseId}/quiz`, { token }),
  submitQuiz: (token: string, courseId: number, answers: Array<{ question_id: number; option_id: number | null }>) =>
    apiRequest<{ attempt: ApiQuizAttempt; passed: boolean; score: number; certificate: ApiCertificate | null }>(`/my/courses/${courseId}/quiz/attempts`, {
      method: 'POST',
      token,
      body: { answers },
    }),
  reviewCourse: (token: string, courseId: number, rating: number, comment: string) =>
    apiRequest<{ data: ApiReview }>(`/my/courses/${courseId}/reviews`, { method: 'POST', token, body: { rating, comment } }),
  certificateUrl: (courseId: number) => `${API_BASE_URL}/my/courses/${courseId}/certificate`,
  downloadCertificate: async (token: string, courseId: number) => {
    const response = await fetch(`${API_BASE_URL}/my/courses/${courseId}/certificate`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new ApiError('Không thể tải chứng chỉ.', response.status);
    }

    return response.blob();
  },

  adminStats: (token: string) => apiRequest<{
    students: number;
    courses: number;
    published_courses: number;
    enrollments: number;
    certificates: number;
    completion_rate: number;
    revenue: number;
  }>('/admin/dashboard/stats', { token }),
  adminUsers: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiUser>>(`/admin/users${queryString(filters)}`, { token }),
  updateUserStatus: (token: string, userId: number, status: 'active' | 'locked') =>
    apiRequest<{ data: ApiUser }>(`/admin/users/${userId}/status`, { method: 'PATCH', token, body: { status } }),
  adminCategories: (token: string) => apiRequest<{ data: ApiCategory[] }>('/admin/categories', { token }),
  createCategory: (token: string, body: { name: string; description?: string }) =>
    apiRequest<{ data: ApiCategory }>('/admin/categories', { method: 'POST', token, body }),
  updateCategory: (token: string, categoryId: number, body: { name: string; description?: string }) =>
    apiRequest<{ data: ApiCategory }>(`/admin/categories/${categoryId}`, { method: 'PUT', token, body }),
  deleteCategory: (token: string, categoryId: number) => apiRequest<void>(`/admin/categories/${categoryId}`, { method: 'DELETE', token }),
  adminCourses: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiCourse>>(`/admin/courses${queryString(filters)}`, { token }),
  adminCourse: (token: string, courseId: number) => apiRequest<{ data: ApiCourse }>(`/admin/courses/${courseId}`, { token }),
  saveCourse: (token: string, body: Record<string, unknown>, courseId?: number) =>
    apiRequest<{ data: ApiCourse }>(courseId ? `/admin/courses/${courseId}` : '/admin/courses', {
      method: courseId ? 'PUT' : 'POST',
      token,
      body,
    }),
  publishCourse: (token: string, courseId: number, status: 'draft' | 'published') =>
    apiRequest<{ data: ApiCourse }>(`/admin/courses/${courseId}/publish`, { method: 'PATCH', token, body: { status } }),
  deleteCourse: (token: string, courseId: number) => apiRequest<void>(`/admin/courses/${courseId}`, { method: 'DELETE', token }),
  saveLesson: (token: string, body: Record<string, unknown>, courseId?: number, lessonId?: number) =>
    apiRequest<{ data: ApiLesson }>(lessonId ? `/admin/lessons/${lessonId}` : `/admin/courses/${courseId}/lessons`, {
      method: lessonId ? 'PUT' : 'POST',
      token,
      body,
    }),
  deleteLesson: (token: string, lessonId: number) => apiRequest<void>(`/admin/lessons/${lessonId}`, { method: 'DELETE', token }),
  saveQuiz: (token: string, courseId: number, body: { title: string; pass_score: number; max_attempts: number }) =>
    apiRequest<ApiQuiz>(`/admin/courses/${courseId}/quiz`, { method: 'POST', token, body }),
  saveQuestion: (token: string, quizId: number, body: { content: string; options: Array<{ content: string; is_correct: boolean }> }) =>
    apiRequest<{ id: number }>(`/admin/quizzes/${quizId}/questions`, { method: 'POST', token, body }),
  adminReviews: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiReview>>(`/admin/reviews${queryString(filters)}`, { token }),
  updateReviewStatus: (token: string, reviewId: number, status: 'visible' | 'hidden') =>
    apiRequest<{ data: ApiReview }>(`/admin/reviews/${reviewId}/status`, { method: 'PATCH', token, body: { status } }),
  deleteReview: (token: string, reviewId: number) => apiRequest<void>(`/admin/reviews/${reviewId}`, { method: 'DELETE', token }),
};
