import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoursePage } from './CoursePage';

const course = vi.hoisted(() => vi.fn());
const reviews = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());
const useCart = vi.hoisted(() => vi.fn());
const add = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { course, reviews },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../cart/CartContext', () => ({ useCart }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CoursePage', () => {
  it('adds only the Course ID before entering the single-Course checkout route', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    useCart.mockReturnValue({ add, contains: () => false });
    add.mockResolvedValue(undefined);
    course.mockResolvedValue({
      data: {
        id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: null, thumbnail: null,
        price: '299000.00', instructor_name: null, instructor_bio: null, level: 'beginner', status: 'published', created_at: '2026-07-10T00:00:00Z',
      },
    });
    reviews.mockResolvedValue({ data: [] });

    const { default: userEvent } = await import('@testing-library/user-event');
    render(<MemoryRouter initialEntries={['/courses/seo-foundation']}><Routes><Route path="/courses/:slug" element={<CoursePage />} /><Route path="/checkout/:slug" element={<div>Checkout route</div>} /></Routes></MemoryRouter>);

    const addToCart = await screen.findByRole('button', { name: 'Thêm vào giỏ hàng' });
    await userEvent.setup().click(addToCart);

    expect(add).toHaveBeenCalledWith(10);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Đăng ký khóa học' }));
    expect(await screen.findByText('Checkout route')).toBeInTheDocument();
    expect(add).toHaveBeenLastCalledWith(10);
  });

  it('renders course information with an accessible enrollment summary', async () => {
    useAuth.mockReturnValue({ user: null });
    useCart.mockReturnValue({ add, contains: () => false });
    course.mockResolvedValue({
      data: {
        id: 10,
        category_id: 1,
        title: 'SEO Foundation',
        slug: 'seo-foundation',
        description: 'Học SEO từ nền tảng đến thực hành.',
        thumbnail: null,
        price: '299000.00',
        instructor_name: 'Nguyễn Minh Anh',
        instructor_bio: 'Chuyên gia SEO với kinh nghiệm triển khai dự án thực tế.',
        teacher_profile_id: 7,
        teacher_profile: {
          id: 7,
          name: 'Nguyễn Minh Anh',
          bio: 'Chuyên gia SEO với kinh nghiệm triển khai dự án thực tế.',
          avatar: '/storage/teacher-profile-images/minh-anh.jpg',
          courses_count: 1,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
        level: 'beginner',
        status: 'published',
        lessons_count: 1,
        has_quiz: true,
        reviews_count: 0,
        rating: 4.8,
        category: { id: 1, name: 'SEO', slug: 'seo', description: null },
        lessons: [{ id: 100, course_id: 10, title: 'SEO căn bản', position: 1, duration: 900 }],
        created_at: '2026-07-10T00:00:00Z',
      },
    });
    reviews.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter initialEntries={['/courses/seo-foundation']}>
        <Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('complementary', { name: 'Thông tin đăng ký' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SEO Foundation' })).toBeInTheDocument();
    const courseInformation = screen.getByRole('region', { name: 'Thông tin khóa học' });
    expect(courseInformation).toHaveTextContent('SEO');
    expect(courseInformation).toHaveTextContent('Cơ bản');
    expect(courseInformation).toHaveTextContent('2 năm');
    expect(courseInformation).toHaveTextContent('1 bài học');
    expect(courseInformation).toHaveTextContent('Có bài kiểm tra cuối khóa');
    expect(courseInformation).toHaveTextContent('Nguyễn Minh Anh');
    const instructor = screen.getByRole('region', { name: 'Thông tin người biên soạn chương trình học' });
    expect(instructor).toHaveTextContent('Nguyễn Minh Anh');
    expect(instructor).toHaveTextContent('Chuyên gia SEO với kinh nghiệm triển khai dự án thực tế.');
    expect(within(instructor).getByRole('img', { name: 'Ảnh người biên soạn chương trình học Nguyễn Minh Anh' })).toHaveAttribute('src', 'http://127.0.0.1:8000/storage/teacher-profile-images/minh-anh.jpg');
    expect(course).toHaveBeenCalledWith('seo-foundation', undefined);
    expect(reviews).toHaveBeenCalledWith('seo-foundation');
  });

  it('does not promise an end-of-course quiz when the course has none', async () => {
    useAuth.mockReturnValue({ user: null });
    useCart.mockReturnValue({ add, contains: () => false });
    course.mockResolvedValue({
      data: {
        id: 11, category_id: 1, title: 'SEO Basics', slug: 'seo-basics', description: null, thumbnail: null,
        price: '99000.00', level: 'beginner', status: 'published', has_quiz: false, lessons_count: 2,
      },
    });
    reviews.mockResolvedValue({ data: [] });

    render(<MemoryRouter initialEntries={['/courses/seo-basics']}><Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'SEO Basics' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Thông tin khóa học' })).toHaveTextContent('Không yêu cầu bài kiểm tra');
    expect(screen.getByRole('complementary', { name: 'Thông tin đăng ký' })).not.toHaveTextContent('Bài kiểm tra cuối khóa');
  });

  it('keeps public course browsing available to admins without learner purchase controls', async () => {
    useAuth.mockReturnValue({ user: { id: 2, role: 'admin' } });
    useCart.mockReturnValue({ add, contains: () => false });
    course.mockResolvedValue({
      data: {
        id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: null, thumbnail: null,
        price: '299000.00', instructor_name: null, instructor_bio: null, level: 'beginner', status: 'published', created_at: '2026-07-10T00:00:00Z',
      },
    });
    reviews.mockResolvedValue({ data: [] });

    render(<MemoryRouter initialEntries={['/courses/seo-foundation']}><Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'SEO Foundation' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Đăng ký khóa học' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm vào giỏ hàng' })).not.toBeInTheDocument();
  });

  it('renders the shared skeleton while course detail is pending', () => {
    useAuth.mockReturnValue({ user: null });
    useCart.mockReturnValue({ add, contains: () => false });
    course.mockImplementation(() => new Promise(() => {}));
    reviews.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/courses/seo-foundation']}>
        <Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });

  it('sends the guest back to this course after login', async () => {
    useAuth.mockReturnValue({ user: null });
    useCart.mockReturnValue({ add, contains: () => false });
    course.mockResolvedValue({ data: { id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: null, thumbnail: null, price: '299000.00', instructor_name: null, instructor_bio: null, level: 'beginner', status: 'published', created_at: '2026-07-10T00:00:00Z' } });
    reviews.mockResolvedValue({ data: [] });
    render(<MemoryRouter initialEntries={['/courses/seo-foundation']}><Routes><Route path="/courses/:slug" element={<CoursePage />} /><Route path="/login" element={<LoginProbe />} /></Routes></MemoryRouter>);
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Đăng nhập để đăng ký' }));
    expect(await screen.findByText('from: /courses/seo-foundation')).toBeInTheDocument();
  });

  it('does not render a legacy teacher snapshot without a teacher profile', async () => {
    useAuth.mockReturnValue({ user: null });
    useCart.mockReturnValue({ add, contains: () => false });
    course.mockResolvedValue({
      data: {
        id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: null, thumbnail: null,
        price: '299000.00', instructor_name: 'Người biên soạn cũ', instructor_bio: 'Dữ liệu cũ', teacher_profile: null,
        level: 'beginner', status: 'published', created_at: '2026-07-10T00:00:00Z',
      },
    });
    reviews.mockResolvedValue({ data: [] });

    render(<MemoryRouter initialEntries={['/courses/seo-foundation']}><Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'SEO Foundation' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Thông tin người biên soạn chương trình học' })).not.toBeInTheDocument();
    expect(screen.queryByText('Người biên soạn cũ')).not.toBeInTheDocument();
  });

  it('loads an uploaded thumbnail from the Laravel origin', async () => {
    useAuth.mockReturnValue({ user: null });
    useCart.mockReturnValue({ add, contains: () => false });
    course.mockResolvedValue({
      data: {
        id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: null,
        thumbnail: '/storage/course-images/seo.jpg', price: '299000.00', instructor_name: null,
        instructor_bio: null, level: 'beginner', status: 'published', created_at: '2026-07-10T00:00:00Z',
      },
    });
    reviews.mockResolvedValue({ data: [] });

    const { container } = render(<MemoryRouter initialEntries={['/courses/seo-foundation']}><Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes></MemoryRouter>);

    await screen.findByRole('heading', { name: 'SEO Foundation' });
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'http://127.0.0.1:8000/storage/course-images/seo.jpg',
    );
  });

  it('shows the enrolled state with a link to the learning page instead of purchase buttons (UC-06)', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    useCart.mockReturnValue({ add, contains: () => false });
    course.mockResolvedValue({ data: { id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: null, thumbnail: null, price: '299000.00', instructor_name: null, instructor_bio: null, level: 'beginner', status: 'published', created_at: '2026-07-10T00:00:00Z', enrollment: { id: 5, expires_at: '2028-01-01T00:00:00Z', status: 'active', is_expired: false } } });
    reviews.mockResolvedValue({ data: [] });
    render(<MemoryRouter initialEntries={['/courses/seo-foundation']}><Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes></MemoryRouter>);

    expect(await screen.findByText('Bạn đã đăng ký khóa học này. Tiếp tục học ngay?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem khóa học' })).toHaveAttribute('href', '/learn/10');
    expect(screen.queryByRole('button', { name: 'Đăng ký khóa học' })).not.toBeInTheDocument();
    expect(course).toHaveBeenCalledWith('seo-foundation', 'student-token');
  });

  it('tells the student when the course is already in the cart (UC-13)', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' }, token: 'student-token' });
    useCart.mockReturnValue({ add, contains: () => true });
    course.mockResolvedValue({ data: { id: 10, category_id: 1, title: 'SEO Foundation', slug: 'seo-foundation', description: null, thumbnail: null, price: '299000.00', instructor_name: null, instructor_bio: null, level: 'beginner', status: 'published', created_at: '2026-07-10T00:00:00Z', enrollment: null } });
    reviews.mockResolvedValue({ data: [] });
    render(<MemoryRouter initialEntries={['/courses/seo-foundation']}><Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes></MemoryRouter>);
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Đã có trong giỏ hàng' }));
    expect(await screen.findByText('Khóa học này đã có trong giỏ hàng.')).toBeInTheDocument();
    expect(add).not.toHaveBeenCalled();
  });
});

function LoginProbe() {
  const location = useLocation();
  return <div>from: {(location.state as { from?: string } | null)?.from}</div>;
}
