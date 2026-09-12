import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { api, ApiError } from '../../lib/api';
import type { PaymentSettings } from '../../lib/contracts';
import { PageSkeleton } from '../../components/AsyncState';

export function PaymentSettingsPanel({ token }: { token: string }) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [savedBank, setSavedBank] = useState<PaymentSettings['bank'] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () => api.paymentSettings(token).then(({ data }) => { setSettings(data); setSavedBank(data.bank); }).catch(() => setError('Không thể tải cấu hình thanh toán.'));
  useEffect(() => { void load(); }, [token]);
  const save = async () => {
    if (!settings) return;
    setSaving(true); setError(''); setNotice('');
    try { const { data } = await api.savePaymentSettings(token, settings); setSettings(data); setSavedBank(data.bank); setNotice('Đã lưu cấu hình thanh toán.'); }
    catch (reason) { setError(reason instanceof ApiError ? [reason.message, ...Object.values(reason.fields).flat()].join(' ') : 'Không thể lưu cấu hình.'); }
    finally { setSaving(false); }
  };
  if (!settings) return error ? <Alert severity="error" action={<Button onClick={() => void load()}>Thử lại</Button>}>{error}</Alert> : <PageSkeleton rows={3} />;
  const bankField = (key: keyof PaymentSettings['bank'], label: string, required = false) => <TextField key={key} label={label} value={settings.bank[key] ?? ''} required={required && settings.bank.enabled && settings.bank.is_active} onChange={(event) => setSettings({ ...settings, bank: { ...settings.bank, [key]: event.target.value } })} fullWidth multiline={key === 'instructions' || key === 'qr_payload'} minRows={key === 'instructions' ? 2 : 1} />;
  return <Box component="form" onSubmit={(event) => { event.preventDefault(); void save(); }}><Stack spacing={3}>
    {error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}
    <Card variant="outlined"><CardContent><Stack spacing={2}>
      <Typography variant="h6">Ví MoMo</Typography>
      <FormControlLabel control={<Switch checked={settings.momo.enabled} onChange={(_, checked) => setSettings({ ...settings, momo: { ...settings.momo, enabled: checked } })} />} label="Bật thanh toán MoMo" />
      <TextField label="Tên đơn vị nhận thanh toán" value={settings.momo.merchant_name} onChange={(event) => setSettings({ ...settings, momo: { ...settings.momo, merchant_name: event.target.value } })} required />
      <Alert severity="info">Tên đơn vị nhận thanh toán được hiển thị trên màn hình thanh toán MoMo của học viên.</Alert>
    </Stack></CardContent></Card>
    <Card variant="outlined"><CardContent><Stack spacing={2}>
      <Typography variant="h6">Tài khoản ngân hàng</Typography>
      <Typography variant="body2" color="text.secondary">Bật thanh toán ngân hàng để hiển thị phương thức này cho học viên. Chỉ tài khoản đang hoạt động mới nhận thanh toán.</Typography>
      <FormControlLabel control={<Switch checked={settings.bank.enabled} onChange={(_, checked) => setSettings({ ...settings, bank: { ...settings.bank, enabled: checked } })} />} label="Bật thanh toán ngân hàng" />
      <FormControlLabel control={<Switch checked={settings.bank.is_active} onChange={(_, checked) => setSettings({ ...settings, bank: { ...settings.bank, is_active: checked } })} />} label="Tài khoản nhận thanh toán đang hoạt động" />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>{bankField('bank_name', 'Tên ngân hàng', true)}{bankField('account_name', 'Tên chủ tài khoản', true)}{bankField('account_number', 'Số tài khoản', true)}{bankField('branch', 'Chi nhánh')}</Box>
      {bankField('qr_payload', 'Nội dung mã QR ngân hàng (tùy chọn)')}
    </Stack></CardContent></Card>
    <Button type="submit" variant="contained" disabled={saving} sx={{ alignSelf: 'flex-start' }}>{saving ? 'Đang lưu...' : 'Lưu cấu hình thanh toán'}</Button>
    {savedBank?.bank_name && savedBank.account_number && <Card variant="outlined"><CardContent><Stack spacing={1}>
      <Typography variant="h6">Tài khoản đã lưu</Typography>
      <Typography fontWeight={700}>{savedBank.bank_name} · {savedBank.account_number}</Typography>
      <Typography>{savedBank.account_name}{savedBank.branch ? ` · ${savedBank.branch}` : ''}</Typography>
      <Typography color={savedBank.enabled && savedBank.is_active ? 'success.main' : 'text.secondary'}>{savedBank.enabled && savedBank.is_active ? 'Đang nhận thanh toán' : 'Chưa nhận thanh toán'}</Typography>
    </Stack></CardContent></Card>}
  </Stack></Box>;
}
