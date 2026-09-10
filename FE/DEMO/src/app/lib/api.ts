import type {
  ApiCatalog,
  ApiCategory,
  ApiCart,
  ApiAdminAttempt,
  ApiAdminAnswerIndex,
  ApiAdminCart,
  ApiAdminCartItem,
  ApiAdminCertificateStatus,
  ApiAdminCourse,
  ApiAdminCourseCategory,
  ApiAdminExam,
  ApiAdminLearningProgress,
  ApiAdminLesson,
  ApiAdminOrder,
  ApiAdminQuestionIndex,
  ApiAdminRole,
  ApiAdminStats,
  ApiAdminQuestion,
  ApiAdminQuiz,
  ApiCertificate,
  ApiCourse,
  ApiEnrollment,
  ApiMyCoursesResponse,
  ApiLesson,
  ApiLessonProgressResponse,
  ApiNewsList,
  ApiNewsPost,
  ApiOrder,
  ApiProgress,
  ApiQuiz,
  ApiQuizAttempt,
  ApiAttemptLifecycleResponse,
  ApiQuizSubmissionResponse,
  ApiReview,
  ApiUser,
  ApiUserRecord,
  Paginated,
  PaymentMethod,
  PaymentSettings,
} from './contracts';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');

/** Stored public files belong to Laravel, which may use a separate origin. */
export function resolveMaterialUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  // Frontend-owned assets such as `/images/news/...` must stay on the Vite
  // origin; only Laravel's public storage paths need the API origin.
  if (value.startsWith('/') && !value.startsWith('/storage/')) return value;
  try {
    const apiUrl = new URL(API_BASE_URL, window.location.origin);
    const url = new URL(value, apiUrl.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields: Record<string, string[]> = {},
    public readonly code?: string,
    public readonly dependencies: Record<string, number> = {},
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

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? 'Không thể kết nối với hệ thống. Vui lòng thử lại.',
      response.status,
      payload?.errors ?? {},
      payload?.code,
      payload?.dependencies ?? {},
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
  updateProfile: (token: string, body: Pick<ApiUser, 'name' | 'phone' | 'avatar'> | FormData) => {
    const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;
    if (isMultipart && !body.has('_method')) body.append('_method', 'PUT');
    return apiRequest<{ data: ApiUser }>('/auth/profile', { method: isMultipart ? 'POST' : 'PUT', token, body });
  },
  updatePassword: (token: string, body: Record<string, string>) =>
    apiRequest<void>('/auth/password', { method: 'PUT', token, body }),

  categories: () => apiRequest<{ data: ApiCategory[] }>('/categories'),
  courses: (filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiCourse>>(`/courses${queryString(filters)}`),
  course: (slug: string) => apiRequest<{ data: ApiCourse }>(`/courses/${slug}`),
  news: (filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<ApiNewsList>(`/news${queryString(filters)}`),
  newsPost: (slug: string) => apiRequest<{ data: ApiNewsPost }>(`/news/${slug}`),
  reviews: (slug: string, page?: number) => apiRequest<Paginated<ApiReview>>(`/courses/${slug}/reviews${queryString({ page })}`),

  createOrder: (token: string, courseId: number) =>
    apiRequest<{ data: ApiOrder }>('/orders', { method: 'POST', token, body: { course_id: courseId } }),
  paymentMethods: (token: string) => apiRequest<{ data: Array<{ code: PaymentMethod; label: string; mode: 'mock' }> }>('/payment-methods', { token }),
  getOrder: (token: string, orderId: number) => apiRequest<{ data: ApiOrder }>(`/orders/${orderId}`, { token }),
  startPayment: (token: string, orderId: number, method: PaymentMethod) => apiRequest<{ data: ApiOrder }>(`/orders/${orderId}/payment-session`, { token, method: 'POST', body: { payment_method: method } }),
  mockPaymentCallback: (token: string, orderId: number, sessionToken: string, outcome: 'success' | 'cancel') => apiRequest<{ order: ApiOrder }>(`/orders/${orderId}/mock-callback`, { token, method: 'POST', body: { session_token: sessionToken, outcome } }),
  transactions: (token: string, page = 1) => apiRequest<Paginated<ApiOrder>>(`/my/transactions?page=${page}`, { token }),
  paymentSettings: (token: string) => apiRequest<{ data: PaymentSettings }>('/admin/payment-settings', { token }),
  savePaymentSettings: (token: string, settings: PaymentSettings) => apiRequest<{ data: PaymentSettings }>('/admin/payment-settings', { token, method: 'PUT', body: settings }),
  payOrder: (token: string, orderId: number, paymentMethod: 'card' | 'qr', outcome: 'success' | 'failure' = 'success') =>
    apiRequest<{ message: string; order: ApiOrder; enrollment?: ApiEnrollment }>(`/orders/${orderId}/pay`, {
      method: 'POST',
      token,
      body: { payment_method: paymentMethod, outcome },
    }),
  getCart: (token: string) => apiRequest<{ data: ApiCart }>('/cart', { token }),
  addCartItem: (token: string, courseId: number) =>
    apiRequest<{ data: ApiCart }>('/cart/items', { method: 'POST', token, body: { course_id: courseId } }),
  deleteCartItem: (token: string, itemId: number) =>
    apiRequest<{ data: ApiCart }>(`/cart/items/${itemId}`, { method: 'DELETE', token }),
  clearCart: (token: string) => apiRequest<void>('/cart', { method: 'DELETE', token }),
  myCourses: (token: string, page = 1) => apiRequest<ApiMyCoursesResponse>(`/my/courses${queryString({ page })}`, { token }),
  lessons: (token: string, courseId: number) => apiRequest<{ data: ApiLesson[] }>(`/my/courses/${courseId}/lessons`, { token }),
  progress: (token: string, courseId: number) => apiRequest<ApiProgress>(`/my/courses/${courseId}/progress`, { token }),
  completeLesson: (token: string, lessonId: number) => apiRequest<ApiProgress>(`/my/lessons/${lessonId}/complete`, { method: 'POST', token }),
  saveLessonProgress: (token: string, lessonId: number, positionSeconds: number, durationSeconds: number) =>
    apiRequest<ApiLessonProgressResponse>(`/my/lessons/${lessonId}/progress`, {
      method: 'PATCH',
      token,
      body: { position_seconds: positionSeconds, duration_seconds: durationSeconds },
    }),
  quiz: (token: string, courseId: number) => apiRequest<{ data: ApiQuiz }>(`/my/courses/${courseId}/quiz`, { token }),
  submitQuiz: (token: string, courseId: number, answers: Array<{ question_id: number; option_id: number | null }>) =>
    apiRequest<ApiQuizSubmissionResponse>(`/my/courses/${courseId}/quiz/attempts`, {
      method: 'POST',
      token,
      body: { answers },
    }),
  startQuizAttempt: (token: string, courseId: number) =>
    apiRequest<ApiAttemptLifecycleResponse>(`/my/courses/${courseId}/quiz/attempts/start`, { method: 'POST', token }),
  saveQuizAnswers: (token: string, attemptId: number, answers: Array<{ question_id: number; option_id: number | null }>) =>
    apiRequest<ApiAttemptLifecycleResponse>(`/my/quiz-attempts/${attemptId}/answers`, { method: 'PATCH', token, body: { answers } }),
  finalizeQuizAttempt: (token: string, attemptId: number) =>
    apiRequest<ApiQuizSubmissionResponse>(`/my/quiz-attempts/${attemptId}/submit`, { method: 'POST', token }),
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

  adminStats: (token: string) => apiRequest<ApiAdminStats>('/admin/dashboard/stats', { token }),
  downloadAdminReport: async (token: string, report: 'enrollments' | 'revenue') => {
    const response = await fetch(`${API_BASE_URL}/admin/reports/${report}`, {
      headers: { Accept: 'text/csv', Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new ApiError('Không thể xuất báo cáo.', response.status);
    return response.blob();
  },
  adminRoles: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminRole>>('/admin/roles' + queryString(filters), { token }),
  adminCarts: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminCart>>('/admin/carts' + queryString(filters), { token }),
  adminCartItems: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminCartItem>>('/admin/cart-items' + queryString(filters), { token }),
  adminOrders: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminOrder>>('/admin/orders' + queryString(filters), { token }),
  adminCourseCategories: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminCourseCategory>>('/admin/course-categories' + queryString(filters), { token }),
  adminLearningProgress: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminLearningProgress>>('/admin/learning-progress' + queryString(filters), { token }),
  adminQuestions: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminQuestionIndex>>('/admin/questions' + queryString(filters), { token }),
  adminAnswers: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminAnswerIndex>>('/admin/answers' + queryString(filters), { token }),
  adminNews: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<ApiNewsList>(`/admin/news${queryString(filters)}`, { token }),
  uploadNewsImage: (token: string, file: File) => {
    const body = new FormData();
    body.append('image', file);
    return apiRequest<{ url: string }>('/admin/news/images', { method: 'POST', token, body });
  },
  saveNews: (token: string, body: Record<string, unknown>, newsId?: number) =>
    apiRequest<{ data: ApiNewsPost }>(newsId ? `/admin/news/${newsId}` : '/admin/news', {
      method: newsId ? 'PUT' : 'POST',
      token,
      body,
    }),
  deleteNews: (token: string, newsId: number) => apiRequest<void>(`/admin/news/${newsId}`, { method: 'DELETE', token }),
  adminUsers: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiUser>>(`/admin/users${queryString(filters)}`, { token }),
  adminUser: (token: string, userId: number) =>
    apiRequest<{ data: ApiUser }>(`/admin/users/${userId}`, { token }),
  adminUserRecords: (token: string, userId: number) =>
    apiRequest<{ data: ApiUserRecord[] }>(`/admin/users/${userId}/records`, { token }),
  updateUserStatus: (token: string, userId: number, status: 'active' | 'locked', reason: string) =>
    apiRequest<{ data: ApiUser }>(`/admin/users/${userId}/status`, { method: 'PATCH', token, body: { status, reason } }),
  updateUserRole: (token: string, userId: number, role: 'student' | 'admin' | 'teacher') =>
    apiRequest<{ data: ApiUser }>(`/admin/users/${userId}/role`, { method: 'PATCH', token, body: { role } }),
  adminCategories: (token: string) => apiRequest<{ data: ApiCategory[] }>('/admin/categories', { token }),
  adminCatalogs: (token: string) => apiRequest<{ data: ApiCatalog[] }>('/admin/catalogs', { token }),
  createCatalog: (token: string, body: { name: string; description?: string }) =>
    apiRequest<{ data: ApiCatalog }>('/admin/catalogs', { token, method: 'POST', body }),
  updateCatalog: (token: string, id: number, body: { name: string; description?: string }) =>
    apiRequest<{ data: ApiCatalog }>(`/admin/catalogs/${id}`, { token, method: 'PUT', body }),
  deleteCatalog: (token: string, id: number) =>
    apiRequest<null>(`/admin/catalogs/${id}`, { token, method: 'DELETE' }),
  createCategory: (token: string, body: { name: string; description?: string }) =>
    apiRequest<{ data: ApiCategory }>('/admin/categories', { method: 'POST', token, body }),
  updateCategory: (token: string, categoryId: number, body: { name: string; description?: string }) =>
    apiRequest<{ data: ApiCategory }>(`/admin/categories/${categoryId}`, { method: 'PUT', token, body }),
  deleteCategory: (token: string, categoryId: number) => apiRequest<void>(`/admin/categories/${categoryId}`, { method: 'DELETE', token }),
  adminCourses: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiCourse>>(`/admin/courses${queryString(filters)}`, { token }),
  adminCourse: (token: string, courseId: number) => apiRequest<{ data: ApiAdminCourse }>(`/admin/courses/${courseId}`, { token }),
  adminLessons: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminLesson>>(`/admin/lessons${queryString(filters)}`, { token }),
  adminExams: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminExam>>(`/admin/exams${queryString(filters)}`, { token }),
  adminEnrollments: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiEnrollment>>(`/admin/enrollments${queryString(filters)}`, { token }),
  adminAttempts: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminAttempt>>(`/admin/attempts${queryString(filters)}`, { token }),
  adminCertificates: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiAdminCertificateStatus>>(`/admin/certificates${queryString(filters)}`, { token }),
  saveCourse: (token: string, body: Record<string, unknown>, courseId?: number) =>
    apiRequest<{ data: ApiCourse }>(courseId ? `/admin/courses/${courseId}` : '/admin/courses', {
      method: courseId ? 'PUT' : 'POST',
      token,
      body,
    }),
  publishCourse: (token: string, courseId: number, status: 'draft' | 'published') =>
    apiRequest<{ data: ApiCourse }>(`/admin/courses/${courseId}/publish`, { method: 'PATCH', token, body: { status } }),
  deleteCourse: (token: string, courseId: number) => apiRequest<void>(`/admin/courses/${courseId}`, { method: 'DELETE', token }),
  saveLesson: (token: string, body: Record<string, unknown> | FormData, courseId?: number, lessonId?: number) => {
    const isMultipartUpdate = Boolean(lessonId) && typeof FormData !== 'undefined' && body instanceof FormData;
    if (isMultipartUpdate && !body.has('_method')) {
      body.append('_method', 'PUT');
    }

    return apiRequest<{ data: ApiLesson }>(lessonId ? `/admin/lessons/${lessonId}` : `/admin/courses/${courseId}/lessons`, {
      method: lessonId && !isMultipartUpdate ? 'PUT' : 'POST',
      token,
      body,
    });
  },
  deleteLesson: (token: string, lessonId: number) => apiRequest<void>(`/admin/lessons/${lessonId}`, { method: 'DELETE', token }),
  reorderLessons: (token: string, courseId: number, order: number[]) =>
    apiRequest<{ data: ApiLesson[] }>(`/admin/courses/${courseId}/lessons/reorder`, {
      method: 'PATCH',
      token,
      body: { order },
    }),
  saveQuiz: (token: string, courseId: number, body: { title: string; pass_score: number; max_attempts: number }) =>
    apiRequest<ApiAdminQuiz>(`/admin/courses/${courseId}/quiz`, { method: 'POST', token, body }),
  saveQuestion: (token: string, quizId: number, body: { content: string; options: Array<{ content: string; is_correct: boolean }> }) =>
    apiRequest<ApiAdminQuestion>(`/admin/quizzes/${quizId}/questions`, { method: 'POST', token, body }),
  updateQuestion: (token: string, questionId: number, body: { content: string; options: Array<{ content: string; is_correct: boolean }> }) =>
    apiRequest<ApiAdminQuestion>(`/admin/questions/${questionId}`, { method: 'PUT', token, body }),
  deleteQuestion: (token: string, questionId: number) => apiRequest<void>(`/admin/questions/${questionId}`, { method: 'DELETE', token }),
  adminReviews: (token: string, filters: Record<string, string | number | undefined> = {}) =>
    apiRequest<Paginated<ApiReview>>(`/admin/reviews${queryString(filters)}`, { token }),
  updateReviewStatus: (token: string, reviewId: number, status: 'visible' | 'hidden') =>
    apiRequest<{ data: ApiReview }>(`/admin/reviews/${reviewId}/status`, { method: 'PATCH', token, body: { status } }),
  deleteReview: (token: string, reviewId: number) => apiRequest<void>(`/admin/reviews/${reviewId}`, { method: 'DELETE', token }),
};
