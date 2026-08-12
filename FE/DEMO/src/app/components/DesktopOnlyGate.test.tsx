import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopOnlyGate } from './DesktopOnlyGate';

afterEach(cleanup);

function setViewportMatch(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
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

describe('DesktopOnlyGate', () => {
  it('renders the application at 1280px and above', () => {
    setViewportMatch(true);

    render(<DesktopOnlyGate><div>Desktop app</div></DesktopOnlyGate>);

    expect(screen.getByText('Desktop app')).toBeVisible();
    expect(screen.queryByText(/Vui lòng sử dụng màn hình máy tính/)).not.toBeInTheDocument();
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width:1280px)');
  });

  it('replaces the application below 1280px', () => {
    setViewportMatch(false);

    render(<DesktopOnlyGate><div>Desktop app</div></DesktopOnlyGate>);

    expect(screen.queryByText('Desktop app')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Vui lòng sử dụng màn hình máy tính để có trải nghiệm đầy đủ.',
    );
  });
});
