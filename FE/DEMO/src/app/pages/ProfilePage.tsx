import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/PageHeader';

export function ProfilePage() {
  const { token, user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setAvatar(user?.avatar ?? '');
  }, [user]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSavingProfile(true);
    try {
      await api.updateProfile(token, { name, phone, avatar });
      await refreshUser();
      setNotice('Đã cập nhật hồ sơ.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError('Không thể cập nhật hồ sơ.', 0));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSavingPassword(true);
    try {
      await api.updatePassword(token, {
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      });
      setNotice('Đã đổi mật khẩu.');
      setCurrentPassword('');
      setPassword('');
      setConfirmation('');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError('Không thể đổi mật khẩu.', 0));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Box sx={{ py: { xs: 4, md: 6 }, minHeight: '70dvh' }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, md: 4 }}>
          <PageHeader
            eyebrow="TÀI KHOẢN"
            title="Hồ sơ cá nhân"
            description="Cập nhật thông tin liên hệ và bảo vệ tài khoản học tập của bạn."
          />
          {notice && <Alert severity="success">{notice}</Alert>}
          {error && <Alert severity="error">{error.message}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '280px minmax(0, 1fr)' }, gap: 2.5, alignItems: 'start' }}>
            <Stack spacing={2} sx={{ minWidth: 0 }}>
              <Card component="section" aria-label="Thông tin tài khoản" variant="outlined">
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <Avatar src={user?.avatar ?? undefined} sx={{ width: 88, height: 88, bgcolor: 'secondary.main', fontSize: 32 }}>
                      {user?.name?.[0]}
                    </Avatar>
                    <Box sx={{ minWidth: 0, width: '100%' }}>
                      <Typography component="h2" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{user?.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>{user?.email}</Typography>
                    </Box>
                    <Chip
                      size="small"
                      color={user?.status === 'active' ? 'primary' : 'default'}
                      variant={user?.status === 'active' ? 'filled' : 'outlined'}
                      label={user?.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
                    />
                  </Stack>
                </CardContent>
              </Card>

              <Card component="section" aria-label="Tổng quan học tập" variant="outlined">
                <CardContent sx={{ p: 2.5 }}>
                  <Typography component="h2" variant="h6" sx={{ mb: 1.5 }}>Tổng quan học tập</Typography>
                  <Stack divider={<Divider flexItem />}>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 1 }}>
                      <SchoolOutlinedIcon color="primary" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Vai trò</Typography>
                        <Typography variant="body2" fontWeight={700}>{user?.role === 'admin' ? 'Quản trị viên' : 'Học viên'}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ py: 1 }}>
                      <CalendarMonthOutlinedIcon color="primary" fontSize="small" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Ngày tham gia</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'Chưa có thông tin'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>

            <Stack spacing={2.5} sx={{ minWidth: 0 }}>
              <Card component="section" aria-label="Thông tin liên hệ" variant="outlined">
                <Box component="form" onSubmit={saveProfile}>
                  <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <PersonOutlineIcon color="primary" />
                        <Typography component="h2" variant="h6">Thông tin liên hệ</Typography>
                      </Stack>
                      <TextField required label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} error={Boolean(error?.fields.name?.[0])} helperText={error?.fields.name?.[0]} />
                      <TextField label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} error={Boolean(error?.fields.phone?.[0])} helperText={error?.fields.phone?.[0]} />
                      <TextField label="URL ảnh đại diện" value={avatar} onChange={(event) => setAvatar(event.target.value)} error={Boolean(error?.fields.avatar?.[0])} helperText={error?.fields.avatar?.[0]} />
                      <Button type="submit" variant="contained" disabled={savingProfile} sx={{ alignSelf: 'flex-start' }}>
                        {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Box>
              </Card>

              <Card component="section" aria-label="Bảo mật tài khoản" variant="outlined">
                <Box component="form" onSubmit={changePassword}>
                  <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <LockOutlinedIcon color="primary" />
                        <Typography component="h2" variant="h6">Bảo mật tài khoản</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">Sử dụng mật khẩu riêng cho tài khoản học tập của bạn.</Typography>
                      <TextField required label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} error={Boolean(error?.fields.current_password?.[0])} helperText={error?.fields.current_password?.[0]} />
                      <TextField required label="Mật khẩu mới" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} error={Boolean(error?.fields.password?.[0])} helperText={error?.fields.password?.[0]} />
                      <TextField required label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={Boolean(error?.fields.password_confirmation?.[0])} helperText={error?.fields.password_confirmation?.[0]} />
                      <Button type="submit" variant="outlined" disabled={savingPassword} sx={{ alignSelf: 'flex-start' }}>
                        {savingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Box>
              </Card>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
