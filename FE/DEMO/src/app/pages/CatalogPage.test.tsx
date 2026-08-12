import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
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

    expect(screen.getByRole('form', { name: 'Bộ lọc khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Khám phá khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Không gian học Search Marketing có cấu trúc' })).toHaveAttribute('src', '/generated-images/catalog-hero.webp');
    expect(screen.getByRole('form', { name: 'Bộ lọc khóa học' })).toBeInTheDocument();
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

  it('sends complete desktop filters, syncs the URL, and resets pagination', async () => {
    vi.mocked(api.categories).mockResolvedValue({ data: [] });
    vi.mocked(api.courses).mockResolvedValue({
      data: [],
      meta: { current_page: 2, last_page: 2, per_page: 12, total: 13 },
    });
    const user = userEvent.setup();

    render(<MemoryRouter initialEntries={['/courses?page=2']}><CatalogPage /><CurrentSearch /></MemoryRouter>);

    const filterForm = await screen.findByRole('form', { name: 'Bộ lọc khóa học' });
    await user.click(screen.getByRole('combobox', { name: 'Cấp độ' }));
    await user.click(screen.getByRole('option', { name: 'Nâng cao' }));
    await user.click(screen.getByRole('combobox', { name: 'Mức giá' }));
    await user.click(screen.getByRole('option', { name: 'Có phí' }));
    await user.click(screen.getByRole('combobox', { name: 'Sắp xếp' }));
    await user.click(screen.getByRole('option', { name: 'Giá giảm dần' }));
    await user.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));

    expect(filterForm).toBeInTheDocument();
    expect(api.courses).toHaveBeenLastCalledWith(expect.objectContaining({
      level: 'advanced',
      price: 'paid',
      sort: 'price_desc',
      page: 1,
    }));
    expect(screen.getByTestId('current-search')).toHaveTextContent('level=advanced');
    expect(screen.getByTestId('current-search')).toHaveTextContent('price=paid');
    expect(screen.getByTestId('current-search')).toHaveTextContent('sort=price_desc');
    expect(screen.getByTestId('current-search')).not.toHaveTextContent('page=2');
  });
});

function CurrentSearch() {
  return <output data-testid="current-search">{useLocation().search}</output>;
}
