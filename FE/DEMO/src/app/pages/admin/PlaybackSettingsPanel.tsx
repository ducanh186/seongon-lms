import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { api, ApiError } from '../../lib/api';
import type { PlaybackSettings } from '../../lib/contracts';
import { PageSkeleton } from '../../components/AsyncState';

export function PlaybackSettingsPanel({ token }: { token: string }) {
  const [settings, setSettings] = useState<PlaybackSettings | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () => api.playbackSettings(token).then(({ data }) => setSettings(data)).catch(() => setError('Không thể tải cấu hình video.'));

  useEffect(() => { void load(); }, [token]);

  const save = async () => {
    if (!settings) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const { data } = await api.savePlaybackSettings(token, settings);
      setSettings(data);
      setNotice('Đã lưu cấu hình video.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể lưu cấu hình video.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return error
    ? <Alert severity="error" action={<Button onClick={() => void load()}>Thử lại</Button>}>{error}</Alert>
    : <PageSkeleton rows={2} />;

  return <Box component="form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Card variant="outlined"><CardContent><Stack spacing={2}>
        <Typography variant="h6">Theo dõi thời lượng video</Typography>
        <Typography variant="body2" color="text.secondary">
          Tắt tạm thời để kiểm thử nhanh. Khi bật, hệ thống chỉ cộng thời gian giữa các heartbeat tuần tự và không tính thao tác tua thẳng.
        </Typography>
        <FormControlLabel
          control={<Switch checked={settings.anti_cheat_enabled} onChange={(_, checked) => setSettings({ anti_cheat_enabled: checked })} />}
          label="Bật chống gian lận video"
        />
        {!settings.anti_cheat_enabled && <Alert severity="warning">Đang ở chế độ kiểm thử toàn hệ thống: học viên có thể tua đến cuối video để hoàn thành bài.</Alert>}
      </Stack></CardContent></Card>
      <Button type="submit" variant="contained" disabled={saving} sx={{ alignSelf: 'flex-start' }}>
        {saving ? 'Đang lưu...' : 'Lưu cấu hình video'}
      </Button>
    </Stack>
  </Box>;
}
