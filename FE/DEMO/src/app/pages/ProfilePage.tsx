import { FormEvent, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, Divider, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

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

  useEffect(() => { setName(user?.name ?? ''); setPhone(user?.phone ?? ''); setAvatar(user?.avatar ?? ''); }, [user]);
  const saveProfile = async (event: FormEvent) => { event.preventDefault(); if (!token) return; setError(null); try { await api.updateProfile(token, { name, phone, avatar }); await refreshUser(); setNotice('Đã cập nhật hồ sơ.'); } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError('Không thể cập nhật hồ sơ.', 0)); } };
  const changePassword = async (event: FormEvent) => { event.preventDefault(); if (!token) return; setError(null); try { await api.updatePassword(token, { current_password: currentPassword, password, password_confirmation: confirmation }); setNotice('Đã đổi mật khẩu.'); setCurrentPassword(''); setPassword(''); setConfirmation(''); } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError('Không thể đổi mật khẩu.', 0)); } };

  return <Box sx={{ py: { xs: 4, md: 7 }, bgcolor: '#f7fafb', minHeight: '70dvh' }}><Container maxWidth="md"><Stack spacing={3}><Box><Typography component="h1" variant="h3" fontWeight={800}>Hồ sơ cá nhân</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{user?.email}</Typography></Box>{notice && <Alert severity="success">{notice}</Alert>}{error && <Alert severity="error">{error.message}</Alert>}<Card component="form" onSubmit={saveProfile} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>Thông tin liên hệ</Typography><TextField required label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} error={Boolean(error?.fields.name?.[0])} helperText={error?.fields.name?.[0]} /><TextField label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} error={Boolean(error?.fields.phone?.[0])} helperText={error?.fields.phone?.[0]} /><TextField label="URL ảnh đại diện" value={avatar} onChange={(event) => setAvatar(event.target.value)} error={Boolean(error?.fields.avatar?.[0])} helperText={error?.fields.avatar?.[0]} /><Button type="submit" variant="contained">Lưu hồ sơ</Button></Stack></CardContent></Card><Card component="form" onSubmit={changePassword} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>Đổi mật khẩu</Typography><Divider /><TextField required label="Mật khẩu hiện tại" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} error={Boolean(error?.fields.current_password?.[0])} helperText={error?.fields.current_password?.[0]} /><TextField required label="Mật khẩu mới" type="password" value={password} onChange={(event) => setPassword(event.target.value)} error={Boolean(error?.fields.password?.[0])} helperText={error?.fields.password?.[0]} /><TextField required label="Xác nhận mật khẩu mới" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={Boolean(error?.fields.password_confirmation?.[0])} helperText={error?.fields.password_confirmation?.[0]} /><Button type="submit" variant="outlined">Đổi mật khẩu</Button></Stack></CardContent></Card></Stack></Container></Box>;
}
