import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { adminRepositories } from './adminRepositories';
import { DashboardService } from '../../application/services/DashboardService';

vi.mock('../../lib/api', () => ({
  api: {
    adminStats: vi.fn(),
    adminUsers: vi.fn(),
    updateUserStatus: vi.fn(),
    adminLessons: vi.fn(),
    adminExams: vi.fn(),
    adminEnrollments: vi.fn(),
    adminAttempts: vi.fn(),
    adminCertificates: vi.fn(),
    adminRoles: vi.fn(),
    adminCarts: vi.fn(),
    adminCartItems: vi.fn(),
    adminOrders: vi.fn(),
    adminCourseCategories: vi.fn(),
    adminLearningProgress: vi.fn(),
    adminQuestions: vi.fn(),
    adminAnswers: vi.fn(),
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

  it('keeps learning-operation reads behind typed repositories', async () => {
    vi.mocked(api.adminLessons).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminExams).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminEnrollments).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminAttempts).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminCertificates).mockResolvedValue({ data: [] } as never);

    await adminRepositories.lessons.list('token', { q: 'SEO', page: 2 });
    await adminRepositories.exams.list('token', { course_id: 10 });
    await adminRepositories.enrollments.list('token', { status: 'active' });
    await adminRepositories.attempts.list('token', { passed: 1 });
    await adminRepositories.certificates.list('token', { status: 'eligible' });

    expect(api.adminLessons).toHaveBeenCalledWith('token', { q: 'SEO', page: 2 });
    expect(api.adminExams).toHaveBeenCalledWith('token', { course_id: 10 });
    expect(api.adminEnrollments).toHaveBeenCalledWith('token', { status: 'active' });
    expect(api.adminAttempts).toHaveBeenCalledWith('token', { passed: 1 });
    expect(api.adminCertificates).toHaveBeenCalledWith('token', { status: 'eligible' });
  });

  it('keeps every new ERD index behind its repository boundary', async () => {
    vi.mocked(api.adminRoles).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminCarts).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminCartItems).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminOrders).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminCourseCategories).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminLearningProgress).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminQuestions).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.adminAnswers).mockResolvedValue({ data: [] } as never);

    await adminRepositories.roles.list('token', { q: 'student', page: 1 });
    await adminRepositories.carts.list('token', { state: 'non_empty', page: 1 });
    await adminRepositories.cartItems.list('token', { course_id: 10, page: 1 });
    await adminRepositories.orders.list('token', { status: 'paid', page: 1 });
    await adminRepositories.courseCategories.list('token', { course_id: 10, page: 1 });
    await adminRepositories.learningProgress.list('token', { completed: 1, page: 1 });
    await adminRepositories.questions.list('token', { exam_id: 3, page: 1 });
    await adminRepositories.answers.list('token', { correct: 1, page: 1 });

    expect(api.adminRoles).toHaveBeenCalledWith('token', { q: 'student', page: 1 });
    expect(api.adminCarts).toHaveBeenCalledWith('token', { state: 'non_empty', page: 1 });
    expect(api.adminCartItems).toHaveBeenCalledWith('token', { course_id: 10, page: 1 });
    expect(api.adminOrders).toHaveBeenCalledWith('token', { status: 'paid', page: 1 });
    expect(api.adminCourseCategories).toHaveBeenCalledWith('token', { course_id: 10, page: 1 });
    expect(api.adminLearningProgress).toHaveBeenCalledWith('token', { completed: 1, page: 1 });
    expect(api.adminQuestions).toHaveBeenCalledWith('token', { exam_id: 3, page: 1 });
    expect(api.adminAnswers).toHaveBeenCalledWith('token', { correct: 1, page: 1 });
  });
});
