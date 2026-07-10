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
  const [error, setError] = useState<string | null>(null);
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
      setError(reason instanceof ApiError ? reason.message : 'Không thể xác thực tài khoản.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f7fafb', py: { xs: 5, md: 8 }, minHeight: '70dvh' }}>
      <Container maxWidth="sm">
        <Paper component="form" onSubmit={submit} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
          <Typography component="h1" variant="h4" fontWeight={800}>Chào mừng bạn</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Đăng nhập để tiếp tục lộ trình học của bạn.</Typography>
          <Tabs value={mode} onChange={(_, value) => setMode(value)} sx={{ mt: 3 }}>
            <Tab value="login" label="Đăng nhập" />
            <Tab value="register" label="Đăng ký" />
          </Tabs>
          <Stack spacing={2} sx={{ mt: 3 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {mode === 'register' && <TextField required label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} />}
            <TextField required label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <TextField required label="Mật khẩu" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} helperText={mode === 'register' ? 'Dùng ít nhất 8 ký tự, bao gồm chữ và số.' : undefined} />
            {mode === 'register' && <TextField required label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />}
            <Button type="submit" variant="contained" disabled={submitting}>{submitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
