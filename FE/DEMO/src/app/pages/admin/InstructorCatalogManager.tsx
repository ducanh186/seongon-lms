import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { ApiError, resolveMaterialUrl } from '../../lib/api';
import type { ApiTeacherProfile } from '../../lib/contracts';
import { adminRepositories } from '../../data/repositories/adminRepositories';
import { AdminDataTable } from '../../components/AdminDataTable';
import { EmptyState } from '../../components/AsyncState';

type InstructorCatalogManagerProps = {
  token: string;
  onChanged?: () => void | Promise<void>;
};

export function InstructorCatalogManager({ token, onChanged }: InstructorCatalogManagerProps) {
  const [rows, setRows] = useState<ApiTeacherProfile[]>([]);
  const [editing, setEditing] = useState<ApiTeacherProfile | null>(null);
  const [removing, setRemoving] = useState<ApiTeacherProfile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    const response = await adminRepositories.instructors.list(token);
    setRows(response.data);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    adminRepositories.instructors.list(token).then((response) => {
      if (!cancelled) setRows(response.data);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof ApiError ? reason.message : 'Không thể tải danh sách người biên soạn chương trình học.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  const reset = () => {
    setEditing(null);
    setName('');
    setBio('');
    setAvatar(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = { name: name.trim(), bio: bio.trim() || undefined, avatar };
      if (editing) await adminRepositories.instructors.update(token, editing.id, body);
      else await adminRepositories.instructors.create(token, body);
      reset();
      await reload();
      await onChanged?.();
      setNotice('Đã lưu người biên soạn chương trình học.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể lưu người biên soạn chương trình học.');
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const response = await adminRepositories.instructors.uploadImage(token, file);
      setAvatar(response.url);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể tải ảnh người biên soạn chương trình học.');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminRepositories.instructors.remove(token, removing.id);
      if (editing?.id === removing.id) reset();
      setRemoving(null);
      await reload();
      await onChanged?.();
      setNotice('Đã xóa người biên soạn chương trình học.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể xóa người biên soạn chương trình học.');
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, .6fr) 1fr' }, gap: 3 }}>
        <Card component="form" onSubmit={(event) => void save(event)} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography component="h2" variant="h6" fontWeight={800}>{editing ? 'Sửa người biên soạn chương trình học' : 'Tạo người biên soạn chương trình học'}</Typography>
              <TextField required label="Tên người biên soạn chương trình học" value={name} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 255 }} />
              <TextField label="Giới thiệu người biên soạn chương trình học" multiline minRows={3} value={bio} onChange={(event) => setBio(event.target.value)} />
              <Box>
                <Typography variant="body2" fontWeight={700}>Ảnh người biên soạn chương trình học</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                  <Avatar src={resolveMaterialUrl(avatar ?? undefined)} alt="Xem trước ảnh người biên soạn chương trình học" sx={{ width: 56, height: 56 }} />
                  <Button component="label" variant="outlined" disabled={busy || uploading}>
                    {uploading ? 'Đang tải ảnh' : 'Chọn ảnh'}
                    <input aria-label="Ảnh người biên soạn chương trình học" hidden type="file" accept="image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadAvatar(file); }} />
                  </Button>
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={busy || !name.trim()}>{editing ? 'Cập nhật người biên soạn' : 'Lưu người biên soạn'}</Button>
                {editing && <Button disabled={busy} onClick={reset}>Hủy</Button>}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            {loading ? <Typography role="status">Đang tải người biên soạn chương trình học...</Typography> : rows.length === 0 ? <EmptyState title="Chưa có người biên soạn chương trình học." /> : <AdminDataTable<ApiTeacherProfile>
              label="Danh sách người biên soạn chương trình học"
              rows={rows}
              getRowKey={(row) => row.id}
              minWidth={620}
              columns={[
                { key: 'name', header: 'Tên người biên soạn', render: (row) => <Stack direction="row" spacing={1} alignItems="center"><Avatar src={resolveMaterialUrl(row.avatar ?? undefined)} alt={`Ảnh người biên soạn chương trình học ${row.name}`} sx={{ width: 32, height: 32 }} /> <Typography fontWeight={700}>{row.name}</Typography></Stack> },
                { key: 'bio', header: 'Giới thiệu', render: (row) => row.bio || 'Chưa có giới thiệu' },
                { key: 'courses_count', header: 'Khóa học', align: 'center', render: (row) => `${row.courses_count} khóa học` },
                { key: 'actions', header: 'Thao tác', align: 'center', width: 150, render: (row) => <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ flexWrap: 'nowrap', '& .MuiButton-root': { minWidth: 48, whiteSpace: 'nowrap', flexShrink: 0 } }}><Button disabled={busy} onClick={() => { setEditing(row); setName(row.name); setBio(row.bio ?? ''); setAvatar(row.avatar); }}>Sửa</Button><Button color="error" disabled={busy} onClick={() => setRemoving(row)}>Xóa</Button></Stack> },
              ]}
            />}
          </CardContent>
        </Card>
      </Box>
      <Dialog open={!!removing} onClose={() => !busy && setRemoving(null)} aria-labelledby="delete-instructor-title">
        <DialogTitle id="delete-instructor-title">Xóa người biên soạn chương trình học?</DialogTitle>
        <DialogContent>{removing?.name}</DialogContent>
        <DialogActions><Button disabled={busy} onClick={() => setRemoving(null)}>Hủy</Button><Button color="error" disabled={busy} onClick={() => void remove()}>Xóa</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
