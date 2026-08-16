import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoursePage } from './CoursePage';

const course = vi.hoisted(() => vi.fn());
const reviews = vi.hoisted(() => vi.fn());
const useAuth = vi.hoisted(() => vi.fn());
const useCart = vi.hoisted(() => vi.fn());
const add = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({ api: { course, reviews } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../cart/CartContext', () => ({ useCart }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CoursePage', () => {
  it('adds only the Course ID before entering the single-Course checkout route', async () => {
    useAuth.mockReturnValue({ user: { id: 1, role: 'student' } });
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
        instructor_name: 'SEONGON',
        instructor_bio: null,
        level: 'beginner',
        status: 'published',
        lessons_count: 1,
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
    expect(course).toHaveBeenCalledWith('seo-foundation');
    expect(reviews).toHaveBeenCalledWith('seo-foundation');
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
});
