import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { PlaybackSettingsPanel } from './PlaybackSettingsPanel';

const mocks = vi.hoisted(() => ({ playbackSettings: vi.fn(), savePlaybackSettings: vi.fn() }));
vi.mock('../../lib/api', async (original) => ({ ...await original<typeof import('../../lib/api')>(), api: mocks }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('loads and saves the global anti-cheat toggle', async () => {
  mocks.playbackSettings.mockResolvedValue({ data: { anti_cheat_enabled: true } });
  mocks.savePlaybackSettings.mockImplementation((_token, submitted) => Promise.resolve({ data: submitted }));
  render(<PlaybackSettingsPanel token="admin" />);
  const user = userEvent.setup();

  const toggle = await screen.findByRole('switch', { name: 'Bật chống gian lận video' });
  expect(toggle).toBeChecked();
  await user.click(toggle);
  await user.click(screen.getByRole('button', { name: 'Lưu cấu hình video' }));

  expect(await screen.findByText('Đã lưu cấu hình video.')).toBeInTheDocument();
  expect(mocks.savePlaybackSettings).toHaveBeenCalledWith('admin', { anti_cheat_enabled: false });
});
