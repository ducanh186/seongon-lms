import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../../lib/api';
import type { ApiInstructor } from '../../lib/contracts';
import { adminRepositories } from '../../data/repositories/adminRepositories';
import { AdminDataTable } from '../../components/AdminDataTable';
import { EmptyState } from '../../components/AsyncState';

export function InstructorCatalogManager({ token }: { token: string }) {
  const [rows, setRows] = useState<ApiInstructor[]>([]);
  const [editing, setEditing] = useState<ApiInstructor | null>(null);
  const [removing, setRemoving] = useState<ApiInstructor | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
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
      if (!cancelled) setError(reason instanceof ApiError ? reason.message : 'Không thể tải danh mục giảng viên.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  const reset = () => {
    setEditing(null);
    setName('');
    setBio('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = { name: name.trim(), bio: bio.trim() || undefined };
      if (editing) await adminRepositories.instructors.update(token, editing.id, body);
      else await adminRepositories.instructors.create(token, body);
      reset();
      await reload();
      setNotice('Đã lưu danh mục giảng viên.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể lưu danh mục giảng viên.');
    } finally {
      setBusy(false);
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
      setNotice('Đã xóa danh mục giảng viên.');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể xóa danh mục giảng viên.');
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
              <Typography component="h2" variant="h6" fontWeight={800}>{editing ? 'Sửa danh mục giảng viên' : 'Tạo danh mục giảng viên'}</Typography>
              <TextField required label="Tên giảng viên" value={name} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 255 }} />
              <TextField label="Giới thiệu giảng viên" multiline minRows={3} value={bio} onChange={(event) => setBio(event.target.value)} />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={busy || !name.trim()}>{editing ? 'Cập nhật giảng viên' : 'Lưu giảng viên'}</Button>
                {editing && <Button disabled={busy} onClick={reset}>Hủy</Button>}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            {loading ? <Typography role="status">Đang tải danh mục giảng viên…</Typography> : rows.length === 0 ? <EmptyState title="Chưa có danh mục giảng viên." /> : <AdminDataTable<ApiInstructor>
              label="Danh sách giảng viên"
              rows={rows}
              getRowKey={(row) => row.id}
              minWidth={620}
              columns={[
                { key: 'name', header: 'Tên giảng viên', render: (row) => <Typography fontWeight={700}>{row.name}</Typography> },
                { key: 'bio', header: 'Giới thiệu', render: (row) => row.bio || 'Chưa có giới thiệu' },
                { key: 'courses_count', header: 'Khóa học', align: 'center', render: (row) => `${row.courses_count} khóa học` },
                { key: 'actions', header: 'Thao tác', align: 'center', width: 150, render: (row) => <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ flexWrap: 'nowrap', '& .MuiButton-root': { minWidth: 48, whiteSpace: 'nowrap', flexShrink: 0 } }}><Button disabled={busy} onClick={() => { setEditing(row); setName(row.name); setBio(row.bio ?? ''); }}>Sửa</Button><Button color="error" disabled={busy} onClick={() => setRemoving(row)}>Xóa</Button></Stack> },
              ]}
            />}
          </CardContent>
        </Card>
      </Box>
      <Dialog open={!!removing} onClose={() => !busy && setRemoving(null)} aria-labelledby="delete-instructor-title">
        <DialogTitle id="delete-instructor-title">Xóa danh mục giảng viên?</DialogTitle>
        <DialogContent>{removing?.name}</DialogContent>
        <DialogActions><Button disabled={busy} onClick={() => setRemoving(null)}>Hủy</Button><Button color="error" disabled={busy} onClick={() => void remove()}>Xóa</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
