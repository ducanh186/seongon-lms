import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrackedLessonVideo } from './TrackedLessonVideo';

describe('TrackedLessonVideo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('restores native video position and persists playback after ten seconds', async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);
    render(
      <TrackedLessonVideo
        url="https://cdn.example.test/lesson.mp4"
        title="Lesson video"
        progress={{ resumePositionSeconds: 25, furthestPositionSeconds: 40, durationSeconds: 100 }}
        onProgress={onProgress}
      />,
    );
    const video = screen.getByRole('video', { name: 'Lesson video' }) as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 });
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(25);

    video.currentTime = 35;
    fireEvent.timeUpdate(video);

    await waitFor(() => expect(onProgress).toHaveBeenCalledWith({ positionSeconds: 35, durationSeconds: 100 }));
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
  });

  it('flushes on pause and exposes a retry action after a save error', async () => {
    const onProgress = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    render(
      <TrackedLessonVideo
        url="https://cdn.example.test/lesson.mp4"
        title="Lesson video"
        onProgress={onProgress}
      />,
    );
    const video = screen.getByRole('video', { name: 'Lesson video' }) as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 });
    video.currentTime = 8;
    fireEvent.pause(video);

    const retry = await screen.findByRole('button', { name: 'Thử lưu lại' });
    await retry.click();
    await waitFor(() => expect(onProgress).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
  });

  it('flushes the final position when playback ends', async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);
    render(
      <TrackedLessonVideo
        url="https://cdn.example.test/lesson.mp4"
        title="Lesson video"
        onProgress={onProgress}
      />,
    );
    const video = screen.getByRole('video', { name: 'Lesson video' }) as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 });
    video.currentTime = 100;
    fireEvent.ended(video);

    await waitFor(() => expect(onProgress).toHaveBeenCalledWith({ positionSeconds: 100, durationSeconds: 100 }));
  });
});
