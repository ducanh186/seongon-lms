import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogPage } from './CatalogPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    categories: vi.fn(),
    courses: vi.fn(),
  },
}));

describe('CatalogPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders API courses and does not show a mock-data fallback', async () => {
    vi.mocked(api.categories).mockResolvedValue({
      data: [{ id: 1, name: 'SEO', slug: 'seo', description: null, courses_count: 1 }],
    });
    vi.mocked(api.courses).mockResolvedValue({
      data: [{
        id: 10,
        category_id: 1,
        title: 'SEO Foundation',
        slug: 'seo-foundation',
        description: 'Hoc SEO tu co ban den thuc hanh.',
        thumbnail: null,
        price: '299000.00',
        instructor_name: 'SEONGON',
        instructor_bio: null,
        level: 'beginner',
        status: 'published',
        lessons_count: 12,
        reviews_count: 4,
        rating: 4.8,
        category: { id: 1, name: 'SEO', slug: 'seo', description: null },
        created_at: '2026-07-10T00:00:00Z',
      }],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
    });

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'SEO Foundation' })).toBeInTheDocument();
    expect(screen.getByText('299.000 đ')).toBeInTheDocument();
    expect(screen.getByText('12 bài học')).toBeInTheDocument();
    expect(api.courses).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('renders the shared skeleton while the catalog request is pending', () => {
    vi.mocked(api.categories).mockResolvedValue({ data: [] });
    vi.mocked(api.courses).mockImplementation(() => new Promise(() => {}));

    render(<MemoryRouter><CatalogPage /></MemoryRouter>);

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });
});
