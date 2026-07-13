import { FormEvent, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Container, Divider, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
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

  useEffect(() => { setName(user?.name ?? ''); setPhone(user?.phone ?? ''); setAvatar(user?.avatar ?? ''); }, [user]);
  const saveProfile = async (event: FormEvent) => { event.preventDefault(); if (!token) return; setError(null); try { await api.updateProfile(token, { name, phone, avatar }); await refreshUser(); setNotice('Đã cập nhật hồ sơ.'); } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError('Không thể cập nhật hồ sơ.', 0)); } };
  const changePassword = async (event: FormEvent) => { event.preventDefault(); if (!token) return; setError(null); try { await api.updatePassword(token, { current_password: currentPassword, password, password_confirmation: confirmation }); setNotice('Đã đổi mật khẩu.'); setCurrentPassword(''); setPassword(''); setConfirmation(''); } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError('Không thể đổi mật khẩu.', 0)); } };

  return <Box sx={{ py: { xs: 5, md: 8 }, minHeight: '70dvh' }}><Container maxWidth="lg"><Stack spacing={4}><PageHeader eyebrow="TÀI KHOẢN" title="Hồ sơ cá nhân" description="Cập nhật thông tin liên hệ và bảo vệ tài khoản học tập của bạn." />{notice && <Alert severity="success">{notice}</Alert>}{error && <Alert severity="error">{error.message}</Alert>}<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}><Card><CardContent sx={{ p: 3, textAlign: 'center' }}><Avatar src={user?.avatar ?? undefined} sx={{ width: 88, height: 88, mx: 'auto', bgcolor: 'secondary.main', fontSize: 32 }}>{user?.name?.[0]}</Avatar><Typography variant="h6" sx={{ mt: 2 }}>{user?.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5, overflowWrap: 'anywhere' }}>{user?.email}</Typography></CardContent></Card><Stack spacing={3}><Card component="form" onSubmit={saveProfile}><CardContent sx={{ p: { xs: 3, md: 4 } }}><Stack spacing={2}><Typography component="h2" variant="h6">Thông tin liên hệ</Typography><TextField required label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} error={Boolean(error?.fields.name?.[0])} helperText={error?.fields.name?.[0]} /><TextField label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} error={Boolean(error?.fields.phone?.[0])} helperText={error?.fields.phone?.[0]} /><TextField label="URL ảnh đại diện" value={avatar} onChange={(event) => setAvatar(event.target.value)} error={Boolean(error?.fields.avatar?.[0])} helperText={error?.fields.avatar?.[0]} /><Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>Lưu hồ sơ</Button></Stack></CardContent></Card><Card component="form" onSubmit={changePassword}><CardContent sx={{ p: { xs: 3, md: 4 } }}><Stack spacing={2}><Typography component="h2" variant="h6">Đổi mật khẩu</Typography><Divider /><TextField required label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} error={Boolean(error?.fields.current_password?.[0])} helperText={error?.fields.current_password?.[0]} /><TextField required label="Mật khẩu mới" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} error={Boolean(error?.fields.password?.[0])} helperText={error?.fields.password?.[0]} /><TextField required label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={Boolean(error?.fields.password_confirmation?.[0])} helperText={error?.fields.password_confirmation?.[0]} /><Button type="submit" variant="outlined" sx={{ alignSelf: 'flex-start' }}>Đổi mật khẩu</Button></Stack></CardContent></Card></Stack></Box></Stack></Container></Box>;
}
