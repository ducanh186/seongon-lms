import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewsDetailPage } from './NewsDetailPage';
import { NewsPage } from './NewsPage';
import { api } from '../lib/api';
import type { ApiNewsList, ApiNewsPost } from '../lib/contracts';

vi.mock('../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    news: vi.fn(),
    newsPost: vi.fn(),
  },
}));

const posts: ApiNewsPost[] = [
  {
    id: 1,
    title: 'SEO 2026: Những thay đổi quan trọng',
    slug: 'seo-2026-thay-doi-quan-trong',
    category: 'SEO',
    excerpt: 'Các cập nhật SEO cần theo dõi.',
    content: 'Nội dung SEO thuần văn bản.',
    thumbnail: null,
    status: 'published',
    published_at: '2026-08-10T00:00:00Z',
    created_at: '2026-08-09T00:00:00Z',
    updated_at: '2026-08-10T00:00:00Z',
  },
  {
    id: 2,
    title: 'Báo cáo quảng cáo tháng 8',
    slug: 'bao-cao-quang-cao-thang-8',
    category: 'Quảng cáo',
    excerpt: 'Các chỉ số quảng cáo nổi bật.',
    content: 'Nội dung quảng cáo thuần văn bản.',
    thumbnail: 'https://example.test/ads.png',
    status: 'published',
    published_at: '2026-08-08T00:00:00Z',
    created_at: '2026-08-07T00:00:00Z',
    updated_at: '2026-08-08T00:00:00Z',
  },
];

function page(
  data: ApiNewsPost[],
  categories = data.map((post) => post.category),
  meta = { current_page: 1, last_page: 1, per_page: 12, total: data.length },
): ApiNewsList {
  return { data, categories, meta };
}

function renderNews(initialEntry = '/news') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('News public pages', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the shared skeleton while the news request is pending', () => {
    vi.mocked(api.news).mockImplementation(() => new Promise(() => {}));

    renderNews();

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });

  it('renders published news cards with public detail links', async () => {
    vi.mocked(api.news).mockResolvedValue(page(posts));

    renderNews();

    expect(await screen.findByRole('heading', { name: posts[0].title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: posts[0].title })).toHaveAttribute('href', `/news/${posts[0].slug}`);
    expect(screen.getByText(posts[1].excerpt)).toBeInTheDocument();
  });

  it('sends the selected category through the news API filter contract', async () => {
    vi.mocked(api.news).mockResolvedValueOnce(page(posts)).mockResolvedValueOnce(page([posts[0]]));
    const user = userEvent.setup();

    renderNews();

    await screen.findByRole('heading', { name: posts[0].title });
    await user.click(screen.getByRole('combobox', { name: 'Chuyên mục' }));
    await user.click(screen.getByRole('option', { name: 'SEO' }));

    await waitFor(() => expect(api.news).toHaveBeenLastCalledWith({ category: 'SEO', page: 1 }));
    expect(await screen.findByRole('heading', { name: posts[0].title })).toBeInTheDocument();
  });

  it('navigates to page 2 through the public news API and renders that page', async () => {
    const pageTwoPost = { ...posts[1], id: 3, title: 'Tin trang hai', slug: 'tin-trang-hai' };
    vi.mocked(api.news)
      .mockResolvedValueOnce(page([posts[0]], ['SEO', 'Quảng cáo'], { current_page: 1, last_page: 2, per_page: 1, total: 2 }))
      .mockResolvedValueOnce(page([pageTwoPost], ['SEO', 'Quảng cáo'], { current_page: 2, last_page: 2, per_page: 1, total: 2 }));
    const user = userEvent.setup();

    renderNews();

    await screen.findByRole('heading', { name: posts[0].title });
    await user.click(screen.getByRole('button', { name: 'Đi tới trang 2' }));

    await waitFor(() => expect(api.news).toHaveBeenLastCalledWith({ category: undefined, page: 2 }));
    expect(await screen.findByRole('heading', { name: pageTwoPost.title })).toBeInTheDocument();
  });

  it('resets to page 1 when the category changes', async () => {
    vi.mocked(api.news)
      .mockResolvedValueOnce(page([posts[0]], ['SEO', 'Quảng cáo'], { current_page: 1, last_page: 2, per_page: 1, total: 2 }))
      .mockResolvedValueOnce(page([posts[1]], ['SEO', 'Quảng cáo'], { current_page: 2, last_page: 2, per_page: 1, total: 2 }))
      .mockResolvedValueOnce(page([posts[0]], ['SEO', 'Quảng cáo'], { current_page: 1, last_page: 1, per_page: 1, total: 1 }));
    const user = userEvent.setup();

    renderNews();

    await screen.findByRole('heading', { name: posts[0].title });
    await user.click(screen.getByRole('button', { name: 'Đi tới trang 2' }));
    await screen.findByRole('heading', { name: posts[1].title });
    await user.click(screen.getByRole('combobox', { name: 'Chuyên mục' }));
    await user.click(screen.getByRole('option', { name: 'SEO' }));

    await waitFor(() => expect(api.news).toHaveBeenLastCalledWith({ category: 'SEO', page: 1 }));
    expect(await screen.findByRole('heading', { name: posts[0].title })).toBeInTheDocument();
  });

  it('offers public API categories even when their posts are outside the current page', async () => {
    vi.mocked(api.news).mockResolvedValue(page([posts[0]], ['SEO', 'Quảng cáo']));
    const user = userEvent.setup();

    renderNews();

    await screen.findByRole('heading', { name: posts[0].title });
    await user.click(screen.getByRole('combobox', { name: 'Chuyên mục' }));

    expect(screen.getByRole('option', { name: 'Quảng cáo' })).toBeInTheDocument();
  });

  it('serializes the selected category for the public news endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(page([])), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const realApiModule = await vi.importActual<typeof import('../lib/api')>('../lib/api');

    await realApiModule.api.news({ category: 'SEO', page: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/v1/news?category=SEO&page=1',
      expect.any(Object),
    );
  });

  it('shows an empty state when the public API returns no posts', async () => {
    vi.mocked(api.news).mockResolvedValue(page([]));

    renderNews();

    expect(await screen.findByText('Chưa có bài viết nào được xuất bản.')).toBeInTheDocument();
  });

  it('shows a request error and retries the public API', async () => {
    vi.mocked(api.news).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(posts));
    const user = userEvent.setup();

    renderNews();

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải tin tức.');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('heading', { name: posts[0].title })).toBeInTheDocument();
    expect(api.news).toHaveBeenCalledTimes(2);
  });

  it('renders the detail route as plain text instead of HTML', async () => {
    const post = { ...posts[0], content: '<script>alert(1)</script>' };
    vi.mocked(api.newsPost).mockResolvedValue({ data: post });

    renderNews(`/news/${post.slug}`);

    expect(await screen.findByRole('heading', { name: post.title })).toBeInTheDocument();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(api.newsPost).toHaveBeenCalledWith(post.slug);
  });
});
