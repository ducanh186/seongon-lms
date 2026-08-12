import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { Home } from './Home';

vi.mock('../lib/api', () => ({
  api: {
    categories: vi.fn(),
    courses: vi.fn(),
    news: vi.fn(),
  },
}));

const featuredCourse = {
  id: 10,
  category_id: 1,
  title: 'SEO Foundation',
  slug: 'seo-foundation',
  description: 'Nền tảng SEO thực chiến cho người mới.',
  thumbnail: null,
  price: '299000',
  instructor_name: 'SEONGON',
  instructor_bio: null,
  level: 'beginner' as const,
  status: 'published' as const,
  lessons_count: 8,
  reviews_count: 12,
  rating: 4.8,
  category: { id: 1, name: 'SEO', slug: 'seo', description: null, courses_count: 4 },
  created_at: '2026-07-10T00:00:00Z',
};

describe('Home', () => {
  beforeEach(() => {
    vi.mocked(api.categories).mockResolvedValue({
      data: [
        featuredCourse.category,
        { id: 2, name: 'Google Ads', slug: 'google-ads', description: null, courses_count: 3 },
      ],
    });
    vi.mocked(api.courses).mockResolvedValue({
      data: Array.from({ length: 8 }, (_, index) => ({
        ...featuredCourse,
        id: index + 1,
        title: `Khóa học Marketing ${index + 1}`,
        slug: `marketing-${index + 1}`,
        thumbnail: `/generated-images/course-${index % 2 === 0 ? 'seo' : 'ads'}.webp`,
      })),
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 8 },
      links: { first: null, last: null, prev: null, next: null },
    });
    vi.mocked(api.news).mockResolvedValue({
      data: [{
        id: 1,
        title: 'Xu hướng Search Marketing 2026',
        slug: 'search-marketing-2026',
        category: 'Kiến thức',
        excerpt: 'Những thay đổi quan trọng dành cho người làm marketing.',
        content: 'Nội dung',
        thumbnail: null,
        status: 'published',
        published_at: '2026-08-12T00:00:00Z',
        created_at: '2026-08-12T00:00:00Z',
        updated_at: '2026-08-12T00:00:00Z',
      }],
      categories: ['Kiến thức'],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    });
  });

  it('renders the prototype-led home hierarchy with real API records', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: /Nền tảng học tập Marketing thực chiến/i })).toBeVisible();
    expect(screen.queryByText('Lộ trình bài học')).not.toBeInTheDocument();
    expect(screen.getAllByText('Nội dung minh họa')).toHaveLength(3);
    expect(screen.getAllByRole('article', { name: /Khóa học/ })).toHaveLength(8);
    expect(screen.getByRole('navigation', { name: 'Danh mục khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá khóa học Google Ads' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Xu hướng Search Marketing 2026' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem tất cả bài viết' })).toHaveAttribute('href', '/news');
    expect(screen.queryByText(/400k|30k|99%/i)).not.toBeInTheDocument();
    expect(api.courses).toHaveBeenCalledWith({ sort: 'popular' });
    expect(api.news).toHaveBeenCalledWith({ page: 1 });
  });
});
