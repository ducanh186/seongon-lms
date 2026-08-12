import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { MyCoursesPage } from './MyCoursesPage';

const { myCourses, downloadCertificate } = vi.hoisted(() => ({
  myCourses: vi.fn(),
  downloadCertificate: vi.fn(),
}));

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { myCourses, downloadCertificate },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ token: 'student-token' }) }));

describe('MyCoursesPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('prevents learning and certificate actions for an expired enrollment with a certificate', async () => {
    myCourses.mockResolvedValue({
      data: [{ id: 1, course_id: 10, enrolled_at: '2025-01-01T00:00:00Z', expires_at: '2026-01-01T00:00:00Z', status: 'expired', is_expired: true, course: { title: 'SEO Foundation' }, progress: { completed: 2, total: 2, percent: 100, can_take_exam: true }, certificate: { id: 8, enrollment_id: 1, certificate_code: 'CERT-EXPIRED-001', issued_at: '2026-01-01T00:00:00Z' } }],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    expect(await screen.findByText('Khóa học đã hết hạn truy cập.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tiếp tục học' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Xem lại khóa học' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tải chứng chỉ' })).not.toBeInTheDocument();
    expect(downloadCertificate).not.toHaveBeenCalled();
  });

  it('uses the shared skeleton while enrollments are loading', () => {
    myCourses.mockImplementation(() => new Promise(() => {}));

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });

  it('uses the required summary hierarchy, default filter, CTA, and certificate visibility', async () => {
    myCourses.mockResolvedValue({
      data: [
        { id: 2, course_id: 20, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'SEO AI Max' }, progress: { completed: 3, total: 10, percent: 30, can_take_exam: false }, certificate: null },
        { id: 3, course_id: 30, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'SEO hoàn thiện' }, progress: { completed: 10, total: 10, percent: 100, can_take_exam: true }, certificate: { id: 7, enrollment_id: 3, certificate_code: 'CERT-UI-001', issued_at: '2026-08-11T00:00:00Z' } },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 2 },
    });
    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    const summary = await screen.findByRole('region', { name: 'Tiến độ học tập' });
    const filterToolbar = screen.getByRole('toolbar', { name: 'Lọc khóa học' });
    expect(Array.from(filterToolbar.querySelectorAll('button')).map((button) => button.textContent)).toEqual([
      'Tất cả',
      'Đang học',
      'Đã hoàn thành',
    ]);
    expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute('aria-pressed', 'true');

    const totalStatistic = screen.getByText('Tổng khóa học').parentElement;
    expect(totalStatistic).not.toBeNull();
    expect(totalStatistic?.textContent).toBe('Tổng khóa học2');
    expect(summary).toContainElement(totalStatistic);

    expect(screen.getByRole('link', { name: 'Khám phá thêm' })).toHaveClass('MuiButton-contained');
    expect(screen.getByRole('button', { name: 'Tải chứng chỉ' })).toBeInTheDocument();
  });

  it('downloads a completed enrollment certificate and releases its Blob URL', async () => {
    const certificateBlob = new Blob(['certificate'], { type: 'application/pdf' });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:certificate');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadCertificate.mockResolvedValue(certificateBlob);
    myCourses.mockResolvedValue({
      data: [{ id: 3, course_id: 30, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'SEO hoàn thiện' }, progress: { completed: 10, total: 10, percent: 100, can_take_exam: true }, certificate: { id: 7, enrollment_id: 3, certificate_code: 'CERT-UI-001', issued_at: '2026-08-11T00:00:00Z' } }],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Tải chứng chỉ' }));

    await waitFor(() => expect(downloadCertificate).toHaveBeenCalledWith('student-token', 30));
    expect(createObjectURL).toHaveBeenCalledWith(certificateBlob);
    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('certificate-CERT-UI-001.pdf');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
  });

  it('shows an API error and does not start a download when certificate retrieval fails', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadCertificate.mockRejectedValue(new ApiError('Không thể tải chứng chỉ.', 404));
    myCourses.mockResolvedValue({
      data: [{ id: 3, course_id: 30, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'SEO hoàn thiện' }, progress: { completed: 10, total: 10, percent: 100, can_take_exam: true }, certificate: { id: 7, enrollment_id: 3, certificate_code: 'CERT-UI-001', issued_at: '2026-08-11T00:00:00Z' } }],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Tải chứng chỉ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải chứng chỉ.');
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  it('keeps the desktop course filters accessible and applies the selected filter', async () => {
    myCourses.mockResolvedValue({
      data: [{ id: 3, course_id: 30, enrolled_at: '2026-01-01T00:00:00Z', expires_at: '2027-01-01T00:00:00Z', status: 'active', is_expired: false, course: { title: 'Google Ads thực chiến' }, progress: { completed: 4, total: 10, percent: 40, can_take_exam: false } }],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    const filters = await screen.findByRole('toolbar', { name: 'Lọc khóa học' });
    fireEvent.click(screen.getByRole('button', { name: 'Đã hoàn thành' }));

    expect(filters).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đã hoàn thành' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Google Ads thực chiến')).not.toBeInTheDocument();
    expect(screen.getByText('Không có khóa học phù hợp với bộ lọc này.')).toBeVisible();
  });

  it('uses global summary counts and exposes the second enrollment page', async () => {
    const enrollment = (id: number, percent = 0) => ({
      id,
      course_id: id,
      enrolled_at: '2026-01-01T00:00:00Z',
      expires_at: '2027-01-01T00:00:00Z',
      status: 'active',
      is_expired: false,
      course: { title: `Khóa học ${id}` },
      progress: { completed: percent === 100 ? 1 : 0, total: 1, percent, can_take_exam: percent === 100 },
      certificate: null,
    });
    myCourses.mockImplementation((_token: string, page = 1) => Promise.resolve({
      data: page === 2 ? [enrollment(13)] : Array.from({ length: 12 }, (_, index) => enrollment(index + 1, index < 3 ? 100 : 0)),
      meta: { current_page: page, last_page: 2, per_page: 12, total: 13 },
      summary: { total: 13, active: 9, completed: 4 },
    }));

    render(<MemoryRouter><MyCoursesPage /></MemoryRouter>);

    await screen.findByText('Khóa học 1');
    const learningSummary = screen.getByRole('region', { name: 'Tiến độ học tập' });
    expect(within(learningSummary).getByText('Tổng khóa học').parentElement).toHaveTextContent('Tổng khóa học13');
    expect(within(learningSummary).getByText('Đang học').parentElement).toHaveTextContent('Đang học9');
    expect(within(learningSummary).getByText('Đã hoàn thành').parentElement).toHaveTextContent('Đã hoàn thành4');

    fireEvent.click(screen.getByRole('button', { name: 'Trang 2' }));

    expect(await screen.findByText('Khóa học 13')).toBeInTheDocument();
    expect(myCourses).toHaveBeenLastCalledWith('student-token', 2);
  });
});
