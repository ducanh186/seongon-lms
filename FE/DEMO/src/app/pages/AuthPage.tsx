import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router';
import { ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = mode === 'login'
        ? await login(email, password)
        : await register(name, email, password, passwordConfirmation);
      const returnPath = (location.state as { from?: string } | null)?.from;
      navigate(returnPath ?? (user.role === 'admin' ? '/admin' : '/my-courses'));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError('Không thể xác thực tài khoản.', 0));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ py: { xs: 5, md: 8 }, minHeight: '70dvh' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '.85fr 1fr' }, border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper', boxShadow: 3 }}>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', p: 5, color: 'common.white', bgcolor: '#12333D', minHeight: 580 }}>
            <Typography variant="overline" fontWeight={800} letterSpacing=".1em">SEONGON ACADEMY</Typography>
            <Box>
              <Typography component="h2" variant="h3">Quay lại lộ trình đang chờ bạn.</Typography>
              <Typography sx={{ mt: 2, color: 'rgba(255,255,255,.72)', lineHeight: 1.8 }}>Học theo bài, theo dõi tiến độ và lưu lại thành quả trong một tài khoản duy nhất.</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.62)' }}>Marketing thực chiến · Lộ trình có cấu trúc</Typography>
          </Box>
          <Paper component="form" onSubmit={submit} elevation={0} sx={{ p: { xs: 3, sm: 5, md: 6 }, borderRadius: 0 }}>
          <Typography variant="overline" color="secondary.dark" fontWeight={800}>TÀI KHOẢN HỌC TẬP</Typography>
          <Typography component="h1" variant="h4" sx={{ mt: 1 }}>Chào mừng bạn</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.25 }}>Đăng nhập để tiếp tục lộ trình học của bạn.</Typography>
          <Tabs value={mode} onChange={(_, value) => setMode(value)} sx={{ mt: 3 }}>
            <Tab value="login" label="Đăng nhập" />
            <Tab value="register" label="Đăng ký" />
          </Tabs>
          <Stack spacing={2} sx={{ mt: 3 }}>
            {error && <Alert severity="error">{error.message}</Alert>}
            {mode === 'register' && <TextField required label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} />}
            <TextField required label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={Boolean(error?.fields.email?.[0])} helperText={error?.fields.email?.[0]} />
            <TextField required label="Mật khẩu" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} error={Boolean(error?.fields.password?.[0])} helperText={error?.fields.password?.[0] ?? (mode === 'register' ? 'Dùng ít nhất 8 ký tự, bao gồm chữ và số.' : undefined)} />
            {mode === 'register' && <TextField required label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} error={Boolean(error?.fields.password_confirmation?.[0])} helperText={error?.fields.password_confirmation?.[0]} />}
            <Button type="submit" size="large" variant="contained" disabled={submitting} aria-busy={submitting}>{submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Button>
          </Stack>
        </Paper>
        </Box>
      </Container>
    </Box>
  );
}
