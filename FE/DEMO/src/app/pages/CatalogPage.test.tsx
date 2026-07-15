import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogPage } from './CatalogPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    categories: vi.fn(),
    courses: vi.fn(),
  },
}));

function useViewport(width: number) {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('767') ? width < 768 : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

describe('CatalogPage', () => {
  beforeEach(() => {
    useViewport(1024);
  });

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

    expect(screen.getByRole('search', { name: 'Tìm khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Bộ lọc khóa học' })).toBeInTheDocument();
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

  it('keeps filters in the desktop sidebar without a drawer trigger', async () => {
    useViewport(1024);
    vi.mocked(api.categories).mockResolvedValue({ data: [] });
    vi.mocked(api.courses).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 },
    });

    render(<MemoryRouter><CatalogPage /></MemoryRouter>);

    expect(await screen.findByRole('complementary', { name: 'Bộ lọc khóa học' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lọc khóa học' })).not.toBeInTheDocument();
  });

  it('opens a focus-trapped filter drawer on mobile and closes it with Escape', async () => {
    useViewport(390);
    vi.mocked(api.categories).mockResolvedValue({ data: [] });
    vi.mocked(api.courses).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 },
    });
    const user = userEvent.setup();

    render(<MemoryRouter><CatalogPage /></MemoryRouter>);

    const trigger = await screen.findByRole('button', { name: 'Lọc khóa học' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('complementary', { name: 'Bộ lọc khóa học' })).not.toBeInTheDocument();

    await user.click(trigger);

    const drawer = await screen.findByRole('complementary', { name: 'Bộ lọc khóa học' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(drawer).getByRole('button', { name: 'Đóng bộ lọc' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('complementary', { name: 'Bộ lọc khóa học' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await screen.findByRole('complementary', { name: 'Bộ lọc khóa học' });
    fireEvent.click(document.querySelector('.MuiBackdrop-root') as HTMLElement);

    expect(screen.queryByRole('complementary', { name: 'Bộ lọc khóa học' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
