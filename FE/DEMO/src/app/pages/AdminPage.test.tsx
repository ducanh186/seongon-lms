import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AdminPage } from './AdminPage';
import { RequireAuth } from '../components/RequireAuth';

const adminStats = vi.hoisted(() => vi.fn());
const adminUsers = vi.hoisted(() => vi.fn());
const adminCategories = vi.hoisted(() => vi.fn());
const adminCourses = vi.hoisted(() => vi.fn());
const adminReviews = vi.hoisted(() => vi.fn());
const adminCourse = vi.hoisted(() => vi.fn());
const reorderLessons = vi.hoisted(() => vi.fn());
const deleteCourse = vi.hoisted(() => vi.fn());
const adminNews = vi.hoisted(() => vi.fn());
const saveNews = vi.hoisted(() => vi.fn());
const deleteNews = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { adminStats, adminUsers, adminCategories, adminCourses, adminReviews, adminCourse, reorderLessons, deleteCourse, adminNews, saveNews, deleteNews },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth }));

const course = {
  id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: 'Course description', thumbnail: null,
  price: '299000', instructor_name: 'SEONGON', instructor_bio: null, level: 'beginner' as const, status: 'draft' as const,
  lessons_count: 2, questions_count: 3, enrollments_count: 4, reviews_count: 0, rating: null, category: { id: 1, name: 'SEO', slug: 'seo', description: null }, created_at: '2026-07-10T00:00:00Z',
};

const selectedCourse = {
  ...course,
  lessons: [
    { id: 7, course_id: 10, title: 'Bài học 1', video_url: 'https://example.test/one', description: null, duration: 120, position: 1 },
    { id: 9, course_id: 10, title: 'Bài học 2', video_url: 'https://example.test/two', description: null, duration: 120, position: 2 },
  ],
  quiz: {
    id: 3, course_id: 10, title: 'Quiz SEO', pass_score: 75, max_attempts: 3,
    questions: [{ id: 18, content: 'Câu hỏi hiện có', options: [{ id: 31, content: 'Đáp án đúng', is_correct: true }, { id: 32, content: 'Đáp án sai', is_correct: false }] }],
  },
};

const newsPosts = [
  {
    id: 21, title: 'Bản nháp SEO', slug: 'ban-nhap-seo', category: 'SEO', excerpt: 'Bản nháp cho quản trị.',
    content: 'Nội dung nháp.', thumbnail: null, status: 'draft' as const, published_at: null,
    created_at: '2026-08-10T00:00:00Z', updated_at: '2026-08-10T00:00:00Z',
  },
  {
    id: 22, title: 'Tin đã xuất bản', slug: 'tin-da-xuat-ban', category: 'Marketing', excerpt: 'Tin công khai.',
    content: 'Nội dung đã xuất bản.', thumbnail: 'https://example.test/news.png', status: 'published' as const,
    published_at: '2026-08-11T00:00:00Z', created_at: '2026-08-10T00:00:00Z', updated_at: '2026-08-11T00:00:00Z',
  },
];

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve: resolve! };
}

function mockAdminData() {
  useAuth.mockReturnValue({ token: 'admin-token', isReady: true, user: { id: 1, role: 'admin' } });
  adminStats.mockResolvedValue({ students: 1, courses: 1, published_courses: 0, enrollments: 0, certificates: 0, completion_rate: 0, revenue: 0 });
  adminUsers.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } });
  adminCategories.mockResolvedValue({ data: [{ id: 1, name: 'SEO', slug: 'seo', description: null, courses_count: 1 }] });
  adminCourses.mockResolvedValue({ data: [course], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } });
  adminReviews.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } });
  adminCourse.mockResolvedValue({ data: selectedCourse });
  reorderLessons.mockResolvedValue({ data: selectedCourse.lessons });
  deleteCourse.mockResolvedValue({});
  adminNews.mockResolvedValue({ data: newsPosts, meta: { current_page: 1, last_page: 1, per_page: 15, total: 2 } });
  saveNews.mockResolvedValue({ data: newsPosts[0] });
  deleteNews.mockResolvedValue({});
}

describe('AdminPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('exposes the six-section management navigation and updates its active state', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    const navigation = await screen.findByRole('navigation', { name: 'Quản trị' });
    expect(within(navigation).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Dashboard',
      'Người dùng',
      'Danh mục',
      'Khóa học',
      'Đánh giá',
      'Quản lý tin tức',
    ]);
    expect(within(navigation).getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(within(navigation).getByRole('button', { name: 'Khóa học' }));

    expect(within(navigation).getByRole('button', { name: 'Khóa học' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('table', { name: 'Danh sách khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Danh sách khóa học, có thể cuộn ngang' })).toHaveAttribute('tabindex', '0');
  });

  it('keeps Course management list-first with aligned aggregate columns', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Khóa học' }));

    expect(screen.queryByRole('heading', { name: 'Tạo khóa học' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo khóa học mới' })).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Danh sách khóa học' });
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Khóa học',
      'Danh mục',
      'Cấp độ',
      'Học phí',
      'Bài học',
      'Câu hỏi',
      'Ghi danh',
      'Trạng thái',
      'Thao tác',
    ]);
    const row = within(table).getByRole('row', { name: /SEO Foundation/ });
    expect(within(row).getAllByRole('cell')).toHaveLength(9);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(9);
    expect(within(table).getByRole('columnheader', { name: 'Thao tác' })).toHaveStyle({ textAlign: 'right' });
    expect(within(row).getAllByRole('cell')[8]).toHaveStyle({ textAlign: 'right' });
    within(within(row).getAllByRole('cell')[8]).getAllByRole('button').forEach((button) => {
      expect(button).toHaveStyle({ whiteSpace: 'nowrap' });
    });

    await user.click(screen.getByRole('button', { name: 'Tạo khóa học mới' }));
    expect(await screen.findByRole('heading', { name: 'Tạo khóa học' })).toBeInTheDocument();
  });

  it('renders the seven Student columns in order with enrollment, date, phone fallback, and lock action', async () => {
    mockAdminData();
    adminUsers.mockResolvedValue({
      data: [{
        id: 2,
        name: 'Nguyễn Văn A',
        email: 'student@example.test',
        role: 'student',
        phone: null,
        avatar: null,
        status: 'active',
        enrollments_count: 2,
        created_at: '2026-08-11T00:00:00Z',
      }],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    });
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Người dùng' }));

    const table = await screen.findByRole('table', { name: 'Danh sách học viên' });
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Học viên',
      'Email',
      'SĐT',
      'Khóa đã đăng ký',
      'Ngày tạo',
      'Trạng thái',
      'Thao tác',
    ]);
    const row = within(table).getByRole('row', { name: /Nguyễn Văn A/ });
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'Nguyễn Văn A',
      'student@example.test',
      '—',
      '2',
      '11/8/2026',
      'Đang hoạt động',
      'Khóa',
    ]);
    expect(within(row).getByRole('button', { name: 'Khóa' })).toBeInTheDocument();
  });

  it('waits for Apply before requesting Student filters and renders the applied result', async () => {
    mockAdminData();
    const filteredStudent = {
      id: 2,
      name: 'Học viên Demo',
      email: 'student@seongon.vn',
      role: 'student',
      phone: null,
      avatar: null,
      status: 'active',
      enrollments_count: 5,
      created_at: '2026-08-11T00:00:00Z',
    };
    adminUsers.mockImplementation((_token, filters) => Promise.resolve({
      data: filters.q === 'Học viên Demo' ? [filteredStudent] : [],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: filters.q === 'Học viên Demo' ? 1 : 0 },
    }));
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Người dùng' }));
    adminUsers.mockClear();
    await user.type(screen.getByLabelText('Tìm học viên'), 'Học viên Demo');

    expect(adminUsers).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }));

    expect(adminUsers).toHaveBeenCalledWith('admin-token', { q: 'Học viên Demo', status: undefined, page: 1 });
    expect(await screen.findByText('student@seongon.vn')).toBeInTheDocument();
  });

  it('waits for Apply before requesting Course filters and renders the applied result', async () => {
    mockAdminData();
    const filteredCourse = { ...course, id: 11, title: 'Completed Demo Course', slug: 'completed-demo-course' };
    adminCourses.mockImplementation((_token, filters) => Promise.resolve({
      data: filters.q === 'Completed Demo Course' ? [filteredCourse] : [course],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    }));
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Khóa học' }));
    adminCourses.mockClear();
    await user.type(screen.getByLabelText('Tìm khóa học'), 'Completed Demo Course');

    expect(adminCourses).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }));

    expect(adminCourses).toHaveBeenCalledWith('admin-token', { q: 'Completed Demo Course', status: undefined, page: 1 });
    expect(await screen.findByText('Completed Demo Course')).toBeInTheDocument();
  });

  it('names the selected course before running its destructive mutation', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Khóa học' }));
    await user.click(screen.getByRole('button', { name: 'Xóa' }));

    expect(screen.getByRole('dialog', { name: 'Xóa khóa học SEO Foundation?' })).toBeInTheDocument();
    expect(deleteCourse).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));

    expect(deleteCourse).toHaveBeenCalledWith('admin-token', 10);
  });

  it('loads existing quiz questions when an admin opens course content', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Khóa học' }));
    await user.click(screen.getByRole('button', { name: 'Nội dung' }));

    expect(await screen.findByDisplayValue('Câu hỏi hiện có')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Đáp án đúng')).toBeInTheDocument();
    expect(adminCourse).toHaveBeenCalledWith('admin-token', 10);
  });

  it('sends the complete lesson id order after moving the first lesson down', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Khóa học' }));
    await user.click(screen.getByRole('button', { name: 'Nội dung' }));
    await user.click(await screen.findByRole('button', { name: 'Di chuyển bài học 1 xuống' }));

    expect(reorderLessons).toHaveBeenCalledWith('admin-token', 10, [9, 7]);
  });

  it('lists draft and published News posts and requests the selected server filters', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quản lý tin tức' }));

    expect(await screen.findByRole('table', { name: 'Danh sách tin tức' })).toBeInTheDocument();
    expect(screen.getByText('Bản nháp SEO')).toBeInTheDocument();
    expect(screen.getByText('Tin đã xuất bản')).toBeInTheDocument();
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();
    expect(screen.getByText('Đang xuất bản')).toBeInTheDocument();

    adminNews.mockClear();
    await user.type(screen.getByLabelText('Tìm tin tức'), 'SEO');
    await user.click(screen.getByLabelText('Trạng thái tin tức'));
    await user.click(screen.getByRole('option', { name: 'Bản nháp' }));
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }));

    expect(adminNews).toHaveBeenCalledWith('admin-token', { q: 'SEO', status: 'draft', page: 1 });
  });

  it('saves News as a plain-text payload only after its editor is opened', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quản lý tin tức' }));
    expect(screen.queryByRole('heading', { name: 'Tạo tin tức' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tạo tin tức mới' }));
    const editorTitle = await screen.findByRole('heading', { name: 'Tạo tin tức' });
    const editor = editorTitle.closest('form');
    expect(editor).not.toBeNull();
    const [title, category, excerpt, content, thumbnail] = within(editor!).getAllByRole('textbox');
    fireEvent.change(title, { target: { value: 'SEO plain text' } });
    fireEvent.change(category, { target: { value: 'SEO' } });
    fireEvent.change(excerpt, { target: { value: 'Tóm tắt không có HTML.' } });
    fireEvent.change(content, { target: { value: 'Dòng một.\nDòng hai.' } });
    fireEvent.change(thumbnail, { target: { value: 'https://example.test/plain.png' } });
    await user.click(screen.getByRole('button', { name: 'Lưu tin tức' }));

    expect(saveNews).toHaveBeenCalledWith('admin-token', {
      title: 'SEO plain text',
      category: 'SEO',
      excerpt: 'Tóm tắt không có HTML.',
      content: 'Dòng một.\nDòng hai.',
      thumbnail: 'https://example.test/plain.png',
      status: 'draft',
    }, undefined);
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Tạo tin tức' })).not.toBeInTheDocument());
  }, 10_000);

  it('keeps the News editor and entered draft open when saving fails', async () => {
    mockAdminData();
    saveNews.mockRejectedValueOnce(new Error('Không thể lưu tin tức.'));
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quản lý tin tức' }));
    await user.click(screen.getByRole('button', { name: 'Tạo tin tức mới' }));
    const editorTitle = await screen.findByRole('heading', { name: 'Tạo tin tức' });
    const editor = editorTitle.closest('form');
    expect(editor).not.toBeNull();
    const [title, category, excerpt, content] = within(editor!).getAllByRole('textbox');
    fireEvent.change(title, { target: { value: 'Bản nháp cần giữ lại' } });
    fireEvent.change(category, { target: { value: 'SEO' } });
    fireEvent.change(excerpt, { target: { value: 'Tóm tắt dự thảo.' } });
    fireEvent.change(content, { target: { value: 'Nội dung dự thảo.' } });
    await user.click(within(editor!).getByRole('button', { name: 'Lưu tin tức' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể hoàn tất yêu cầu quản trị.');
    expect(screen.getByRole('heading', { name: 'Tạo tin tức' })).toBeInTheDocument();
    const retainedFields = within(editor!).getAllByRole('textbox');
    expect(retainedFields[0]).toHaveValue('Bản nháp cần giữ lại');
    expect(retainedFields[3]).toHaveValue('Nội dung dự thảo.');
  });

  it('names the News post before confirming deletion', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quản lý tin tức' }));
    const draftRow = await screen.findByRole('row', { name: /Bản nháp SEO/ });
    await user.click(within(draftRow).getByRole('button', { name: 'Xóa' }));

    expect(screen.getByRole('dialog', { name: 'Xóa tin tức Bản nháp SEO?' })).toBeInTheDocument();
    expect(deleteNews).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));

    expect(deleteNews).toHaveBeenCalledWith('admin-token', 21);
  });

  it('sends the complete published payload when an admin publishes a draft News post', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quản lý tin tức' }));
    const draftRow = await screen.findByRole('row', { name: /Bản nháp SEO/ });
    await user.click(within(draftRow).getByRole('button', { name: 'Xuất bản' }));

    expect(saveNews).toHaveBeenCalledWith('admin-token', {
      title: 'Bản nháp SEO',
      category: 'SEO',
      excerpt: 'Bản nháp cho quản trị.',
      content: 'Nội dung nháp.',
      thumbnail: null,
      status: 'published',
    }, 21);
  });

  it('sends the complete draft payload when an admin unpublishes a News post', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quản lý tin tức' }));
    const publishedRow = await screen.findByRole('row', { name: /Tin đã xuất bản/ });
    await user.click(within(publishedRow).getByRole('button', { name: 'Chuyển về nháp' }));

    expect(saveNews).toHaveBeenCalledWith('admin-token', {
      title: 'Tin đã xuất bản',
      category: 'Marketing',
      excerpt: 'Tin công khai.',
      content: 'Nội dung đã xuất bản.',
      thumbnail: 'https://example.test/news.png',
      status: 'draft',
    }, 22);
  });

  it('waits for Apply before requesting News filters and keeps the newest applied result', async () => {
    mockAdminData();
    render(<AdminPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Quản lý tin tức' }));
    await screen.findByRole('table', { name: 'Danh sách tin tức' });
    const olderRequest = deferred<{ data: typeof newsPosts; meta: { current_page: number; last_page: number; per_page: number; total: number } }>();
    const newerPost = { ...newsPosts[1], id: 23, title: 'Tin mới nhất', slug: 'tin-moi-nhat' };
    adminNews.mockReset();
    adminNews.mockImplementationOnce(() => olderRequest.promise).mockResolvedValueOnce({
      data: [newerPost], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    });

    const search = screen.getByLabelText('Tìm tin tức');
    await user.type(search, 'cu');
    expect(adminNews).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(adminNews).toHaveBeenCalledWith('admin-token', { q: 'cu', status: undefined, page: 1 });

    await user.clear(search);
    await user.type(search, 'moi');
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(adminNews).toHaveBeenLastCalledWith('admin-token', { q: 'moi', status: undefined, page: 1 });
    expect(await screen.findByText('Tin mới nhất')).toBeInTheDocument();

    olderRequest.resolve({ data: [newsPosts[0]], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 } });

    await waitFor(() => expect(screen.queryByText('Bản nháp SEO')).not.toBeInTheDocument());
    expect(screen.getByText('Tin mới nhất')).toBeInTheDocument();
  });

  it('redirects a Student away from the Admin route before AdminPage renders', async () => {
    useAuth.mockReturnValue({ token: 'student-token', isReady: true, user: { id: 2, role: 'student' } });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RequireAuth role="admin" />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="/my-courses" element={<div>Khóa học của tôi</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Khóa học của tôi')).toBeInTheDocument();
    expect(screen.queryByText('Quản trị SEONGON LMS')).not.toBeInTheDocument();
  });
});
