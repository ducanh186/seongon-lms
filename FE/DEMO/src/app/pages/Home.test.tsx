import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { Home } from './Home';

vi.mock('../lib/api', () => ({
  api: {
    categories: vi.fn(),
    courses: vi.fn(),
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
      data: [featuredCourse.category],
    });
    vi.mocked(api.courses).mockResolvedValue({
      data: [featuredCourse],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
      links: { first: null, last: null, prev: null, next: null },
    });
  });

  it('uses real API categories and popular courses for discovery', async () => {
    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'SEO Foundation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Khám phá 4 khóa học SEO/i })).toHaveAttribute('href', '/courses?category=seo');
    expect(api.courses).toHaveBeenCalledWith({ sort: 'popular' });
  });
});
