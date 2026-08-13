import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { CourseMegaMenu } from './CourseMegaMenu';

vi.mock('../lib/api', () => ({ api: { categories: vi.fn() } }));

const categories = [
  { id: 1, name: 'SEO', slug: 'seo', description: 'Search Engine Optimization', courses_count: 4 },
  { id: 2, name: 'Google Ads', slug: 'google-ads', description: null, courses_count: 3 },
];

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderMenu(active = false) {
  return render(<MemoryRouter><CourseMegaMenu active={active} /></MemoryRouter>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  setReducedMotion(false);
});

describe('CourseMegaMenu', () => {
  it('preloads categories before the first hover', async () => {
    vi.mocked(api.categories).mockResolvedValue({ data: categories });

    renderMenu();

    expect(api.categories).toHaveBeenCalledOnce();
    await act(async () => Promise.resolve());
    expect(screen.queryByRole('navigation', { name: 'Danh mục khóa học' })).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Khóa học' }));

    expect(within(screen.getByRole('navigation', { name: 'Danh mục khóa học' })).getByRole('link', { name: /SEO/ })).toBeVisible();
    expect(api.categories).toHaveBeenCalledOnce();
  });

  it('opens on mouseenter, loads API categories once, and routes by category query', async () => {
    vi.mocked(api.categories).mockResolvedValue({ data: categories });
    renderMenu(true);
    const trigger = screen.getByRole('link', { name: 'Khóa học' });

    fireEvent.mouseEnter(trigger);

    const panel = await screen.findByRole('navigation', { name: 'Danh mục khóa học' });
    expect(panel).toHaveStyle({ position: 'fixed', left: '0px', right: '0px' });
    expect(trigger).toHaveAttribute('href', '/courses');
    expect(trigger).toHaveAttribute('aria-current', 'page');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByRole('link', { name: /SEO/ })).toHaveAttribute('href', '/courses?category=seo');
    expect(within(panel).getByRole('link', { name: /Google Ads/ })).toHaveAttribute('href', '/courses?category=google-ads');

    fireEvent.mouseLeave(panel);
    fireEvent.mouseEnter(trigger);
    expect(api.categories).toHaveBeenCalledOnce();
  });

  it('keeps the panel open on re-entry and closes 200ms after leaving both regions', async () => {
    vi.useFakeTimers();
    vi.mocked(api.categories).mockResolvedValue({ data: categories });
    renderMenu();
    const trigger = screen.getByRole('link', { name: 'Khóa học' });
    fireEvent.mouseEnter(trigger);
    await act(async () => Promise.resolve());
    const panel = screen.getByRole('navigation', { name: 'Danh mục khóa học' });

    fireEvent.mouseLeave(trigger);
    fireEvent.mouseEnter(panel);
    act(() => vi.advanceTimersByTime(250));
    expect(panel).toBeVisible();

    fireEvent.mouseLeave(panel);
    act(() => vi.advanceTimersByTime(199));
    expect(panel).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('navigation', { name: 'Danh mục khóa học' })).not.toBeInTheDocument();
  });

  it('opens on focus and Escape closes the panel and restores trigger focus', async () => {
    vi.mocked(api.categories).mockResolvedValue({ data: categories });
    renderMenu();
    const trigger = screen.getByRole('link', { name: 'Khóa học' });

    fireEvent.focus(trigger);
    expect(await screen.findByRole('navigation', { name: 'Danh mục khóa học' })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('navigation', { name: 'Danh mục khóa học' }), { key: 'Escape' });

    expect(screen.queryByRole('navigation', { name: 'Danh mục khóa học' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it.each([
    ['empty', () => Promise.resolve({ data: [] }), 'Chưa có danh mục khóa học.'],
    ['error', () => Promise.reject(new Error('network')), 'Không thể tải danh mục khóa học.'],
  ])('renders the %s state', async (_state, result, message) => {
    vi.mocked(api.categories).mockImplementation(result);
    renderMenu();
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Khóa học' }));
    expect(await screen.findByText(message)).toBeVisible();
  });

  it('shows loading and disables animation for reduced motion', () => {
    setReducedMotion(true);
    vi.mocked(api.categories).mockReturnValue(new Promise(() => undefined));
    renderMenu();
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Khóa học' }));

    expect(screen.getByText('Đang tải danh mục...')).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Danh mục khóa học' })).toHaveStyle({ transitionDuration: '0ms' });
  });
});
