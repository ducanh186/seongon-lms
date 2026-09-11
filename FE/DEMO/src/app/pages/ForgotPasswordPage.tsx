import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router';
import { api, ApiError } from '../lib/api';

type Step = 'request' | 'verify' | 'reset';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resendGeneration, setResendGeneration] = useState(0);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(60);
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step !== 'verify') {
      return undefined;
    }

    setCanResend(false);
    const timer = window.setTimeout(() => setCanResend(true), retryAfterSeconds * 1000);

    return () => window.clearTimeout(timer);
  }, [resendGeneration, retryAfterSeconds, step]);

  const requestOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await api.requestPasswordReset({ email });
      setRetryAfterSeconds(response.retry_after_seconds ?? 60);
      setStep('verify');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError('Không thể gửi OTP.', 0));
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await api.verifyPasswordReset({ email, otp });
      setResetToken(response.reset_token);
      setStep('reset');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError('Không thể xác nhận OTP.', 0));
    } finally {
      setSubmitting(false);
    }
  };

  const resendOtp = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const response = await api.requestPasswordReset({ email });
      setRetryAfterSeconds(response.retry_after_seconds ?? 60);
      setOtp('');
      setResendGeneration((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError('Không thể gửi lại OTP.', 0));
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.completePasswordReset({
        email,
        reset_token: resetToken,
        password,
        password_confirmation: passwordConfirmation,
      });
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError('Không thể đặt lại mật khẩu.', 0));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ py: 8, minHeight: '70dvh' }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: 5, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
          {step === 'request' ? (
            <Stack component="form" spacing={2.5} onSubmit={requestOtp}>
              <Typography component="h1" variant="h4">Quên mật khẩu</Typography>
              <Typography color="text.secondary">Nhập email tài khoản để nhận mã OTP.</Typography>
              {error && <Alert severity="error">{error.message}</Alert>}
              <TextField required label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={Boolean(error?.fields.email?.[0])} helperText={error?.fields.email?.[0]} />
              <Button type="submit" size="large" variant="contained" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi OTP'}</Button>
              <Button component={Link} to="/login">Quay lại đăng nhập</Button>
            </Stack>
          ) : step === 'verify' ? (
            <Stack component="form" spacing={2.5} onSubmit={verifyOtp}>
              <Typography component="h1" variant="h4">Xác nhận OTP</Typography>
              <Typography color="text.secondary">Nhập mã OTP 6 số đã được gửi tới email của bạn.</Typography>
              {error && <Alert severity="error">{error.message}</Alert>}
              <TextField required label="Mã OTP" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} error={Boolean(error?.fields.otp?.[0])} helperText={error?.fields.otp?.[0]} slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 } }} />
              <Button type="submit" size="large" variant="contained" disabled={submitting}>{submitting ? 'Đang xác nhận...' : 'Xác nhận OTP'}</Button>
              <Button type="button" disabled={!canResend || submitting} onClick={resendOtp}>Gửi lại OTP</Button>
            </Stack>
          ) : (
            <Stack component="form" spacing={2.5} onSubmit={resetPassword}>
              <Typography component="h1" variant="h4">Đặt mật khẩu mới</Typography>
              <Typography color="text.secondary">Mật khẩu mới phải có ít nhất 8 ký tự.</Typography>
              {error && <Alert severity="error">{error.message}</Alert>}
              <TextField required label="Mật khẩu mới" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} error={Boolean(error?.fields.password?.[0])} helperText={error?.fields.password?.[0]} />
              <TextField required label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} error={Boolean(error?.fields.password_confirmation?.[0])} helperText={error?.fields.password_confirmation?.[0]} />
              <Button type="submit" size="large" variant="contained" disabled={submitting}>{submitting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}</Button>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
