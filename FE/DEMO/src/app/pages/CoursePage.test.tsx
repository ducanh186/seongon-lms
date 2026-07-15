import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { CoursePage } from './CoursePage';

const course = vi.hoisted(() => vi.fn());
const reviews = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({ api: { course, reviews } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

describe('CoursePage', () => {
  it('renders course information with an accessible enrollment summary', async () => {
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

  it('renders the shared skeleton while course detail is pending', () => {
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
