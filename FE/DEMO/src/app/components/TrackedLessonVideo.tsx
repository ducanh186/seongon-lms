import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';

export type PlaybackSnapshot = {
  positionSeconds: number;
  durationSeconds: number;
};

type PlaybackProgress = {
  resumePositionSeconds?: number | null;
  furthestPositionSeconds?: number | null;
  durationSeconds?: number | null;
};

type TrackedLessonVideoProps = {
  url: string;
  title: string;
  progress?: PlaybackProgress;
  onProgress: (snapshot: PlaybackSnapshot) => Promise<void> | void;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function TrackedLessonVideo({ url, title, progress, onProgress }: TrackedLessonVideoProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const positionRef = useRef(Math.max(0, progress?.resumePositionSeconds ?? 0));
  const durationRef = useRef(Math.max(0, progress?.durationSeconds ?? 0));
  const lastSavedRef = useRef(positionRef.current);
  const lastSnapshotRef = useRef<PlaybackSnapshot | null>(null);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const onProgressRef = useRef(onProgress);
  const [position, setPosition] = useState(positionRef.current);
  const [duration, setDuration] = useState(durationRef.current);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const nextPosition = Math.max(0, progress?.resumePositionSeconds ?? 0);
    const nextDuration = Math.max(0, progress?.durationSeconds ?? 0);
    positionRef.current = nextPosition;
    durationRef.current = nextDuration;
    lastSavedRef.current = nextPosition;
    setPosition(nextPosition);
    setDuration(nextDuration);
    setSaveState('idle');
  }, [progress?.durationSeconds, progress?.resumePositionSeconds, url]);

  const persist = useCallback((force = false) => {
    const safeDuration = Math.round(durationRef.current);
    const safePosition = Math.min(Math.round(positionRef.current), safeDuration);
    if (safeDuration <= 0 || (!force && Math.abs(safePosition - lastSavedRef.current) < 10)) {
      return savePromiseRef.current ?? Promise.resolve();
    }

    const snapshot = { positionSeconds: safePosition, durationSeconds: safeDuration };
    lastSnapshotRef.current = snapshot;
    setSaveState('saving');
    const request = Promise.resolve(onProgressRef.current(snapshot))
      .then(() => {
        lastSavedRef.current = snapshot.positionSeconds;
        setSaveState('saved');
      })
      .catch(() => setSaveState('error'))
      .finally(() => {
        if (savePromiseRef.current === request) savePromiseRef.current = null;
      });
    savePromiseRef.current = request;
    return request;
  }, []);

  const updatePlayback = useCallback((nextPosition: number, nextDuration: number, force = false) => {
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) return;
    durationRef.current = nextDuration;
    positionRef.current = Math.min(Math.max(0, nextPosition), nextDuration);
    setDuration(nextDuration);
    setPosition(positionRef.current);
    void persist(force);
  }, [persist]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') void persist(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [persist]);

  useEffect(() => {
    if (!isYouTubeUrl(url)) return;
    const targetOrigin = youtubeOrigin(url);
    const send = (func: string, args: unknown[] = []) => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), targetOrigin);
    };
    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedYouTubeOrigin(event.origin) || typeof event.data !== 'string') return;
      let payload: { event?: string; info?: number | { currentTime?: number; duration?: number } | null };
      try {
        payload = JSON.parse(event.data) as typeof payload;
      } catch {
        return;
      }
      if (payload.event === 'onReady' && positionRef.current > 0) send('seekTo', [positionRef.current, true]);
      if (payload.info && typeof payload.info === 'object') {
        updatePlayback(payload.info.currentTime ?? positionRef.current, payload.info.duration ?? durationRef.current);
      }
      if (payload.event === 'onStateChange' && payload.info === 2) void persist(true);
      if (payload.event === 'onStateChange' && payload.info === 0) {
        positionRef.current = durationRef.current;
        setPosition(durationRef.current);
        void persist(true);
      }
    };

    window.addEventListener('message', handleMessage);
    const interval = window.setInterval(() => {
      send('getCurrentTime');
      send('getDuration');
    }, 1000);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('message', handleMessage);
      void persist(true);
    };
  }, [persist, updatePlayback, url]);

  const retry = () => {
    const snapshot = lastSnapshotRef.current;
    if (!snapshot) return;
    positionRef.current = snapshot.positionSeconds;
    durationRef.current = snapshot.durationSeconds;
    void persist(true);
  };

  const watchedPercent = duration > 0
    ? Math.min(100, Math.floor(Math.max(progress?.furthestPositionSeconds ?? 0, position) / duration * 100))
    : 0;

  return (
    <Stack spacing={1.25}>
      {isYouTubeUrl(url) ? (
        <Box
          ref={iframeRef}
          component="iframe"
          src={youtubeEmbedUrl(url)}
          title={title}
          sx={videoFrameSx}
          allowFullScreen
          onLoad={() => {
            const target = iframeRef.current?.contentWindow;
            const origin = youtubeOrigin(url);
            target?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), origin);
            target?.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onReady'], id: 1 }), origin);
            target?.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1 }), origin);
          }}
        />
      ) : (
        <Box
          component="video"
          role="video"
          src={url}
          title={title}
          aria-label={title}
          controls
          sx={videoFrameSx}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            durationRef.current = video.duration;
            setDuration(video.duration);
            video.currentTime = Math.min(positionRef.current, video.duration);
          }}
          onTimeUpdate={(event) => updatePlayback(event.currentTarget.currentTime, event.currentTarget.duration)}
          onPause={(event) => updatePlayback(event.currentTarget.currentTime, event.currentTarget.duration, true)}
          onEnded={(event) => {
            const finalDuration = Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0
              ? event.currentTarget.duration
              : durationRef.current;
            updatePlayback(finalDuration, finalDuration, true);
          }}
        />
      )}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 82 }}>
          {formatTime(position)} / {formatTime(duration)}
        </Typography>
        <LinearProgress variant="determinate" value={watchedPercent} aria-label="Tiến độ video" sx={{ flex: 1, height: 6, borderRadius: 1 }} />
        {saveState === 'saving' && <Typography variant="caption" color="text.secondary">Đang lưu</Typography>}
        {saveState === 'saved' && <Typography variant="caption" color="success.main">Đã lưu</Typography>}
        {saveState === 'error' && <Button size="small" color="error" onClick={retry}>Thử lưu lại</Button>}
      </Stack>
    </Stack>
  );
}

const videoFrameSx = {
  width: '100%', maxWidth: '100%', aspectRatio: '16 / 9', display: 'block', border: 0, borderRadius: 2, bgcolor: '#102E38',
};

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const seconds = Math.floor(value);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function isTrustedYouTubeOrigin(origin: string): boolean {
  return ['https://www.youtube.com', 'https://youtube.com', 'https://www.youtube-nocookie.com'].includes(origin);
}

function youtubeOrigin(url: string): string {
  return url.includes('youtube-nocookie.com') ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
}

function youtubeEmbedUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  const appOrigin = typeof window === 'undefined' ? '' : `&origin=${encodeURIComponent(window.location.origin)}`;
  return `${url}${separator}enablejsapi=1${appOrigin}`;
}
