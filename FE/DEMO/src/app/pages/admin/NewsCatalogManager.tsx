import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { adminRepositories } from '../../data/repositories/adminRepositories';
import { AdminDataTable } from '../../components/AdminDataTable';
import type { ApiCatalog } from '../../lib/contracts';
import { EmptyState } from '../../components/AsyncState';

export function NewsCatalogManager({ token }: { token: string }) {
  const [rows, setRows] = useState<ApiCatalog[]>([]);
  const [editing, setEditing] = useState<ApiCatalog | null>(null);
  const [removing, setRemoving] = useState<ApiCatalog | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reload = useCallback(async () => {
    const response = await adminRepositories.catalogs.list(token);
    setRows(response.data);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminRepositories.catalogs.list(token).then((response) => {
      if (!cancelled) setRows(response.data);
    }).catch(() => {
      if (!cancelled) setError('Không thể tải danh mục tin tức.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const reset = () => { setEditing(null); setName(''); setDescription(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const body = { name: name.trim(), description: description.trim() };
      if (editing) await adminRepositories.catalogs.update(token, editing.id, body);
      else await adminRepositories.catalogs.create(token, body);
      reset();
      await reload();
      setNotice('Đã lưu danh mục tin tức.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu danh mục.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!removing) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await adminRepositories.catalogs.remove(token, removing.id);
      if (editing?.id === removing.id) reset();
      setRemoving(null);
      await reload();
      setNotice('Đã xóa danh mục tin tức.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể xóa danh mục.'); setRemoving(null); }
    finally { setBusy(false); }
  };

  return <Stack spacing={3}>
    {error && <Alert severity="error">{error}</Alert>}
    {notice && <Alert severity="success">{notice}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, .6fr) 1fr' }, gap: 3 }}>
      <Card component="form" onSubmit={(event) => void save(event)} sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}><Typography component="h2" variant="h6" fontWeight={800}>{editing ? 'Sửa danh mục tin tức' : 'Tạo danh mục tin tức'}</Typography><TextField required label="Tên danh mục tin tức" value={name} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 100 }} /><TextField label="Mô tả danh mục" multiline minRows={3} value={description} onChange={(event) => setDescription(event.target.value)} inputProps={{ maxLength: 2000 }} /><Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={busy || !name.trim()}>{editing ? 'Cập nhật danh mục' : 'Lưu danh mục tin tức'}</Button>{editing && <Button disabled={busy} onClick={reset}>Hủy</Button>}</Stack></Stack></CardContent></Card>
      <Card sx={{ borderRadius: 3 }}><CardContent>{loading ? <Typography role="status">Đang tải danh mục tin tức…</Typography> : rows.length === 0 ? <EmptyState title="Chưa có danh mục tin tức." /> : <AdminDataTable<ApiCatalog>
        label="Danh sách danh mục tin tức" rows={rows} getRowKey={(row) => row.id} minWidth={480}
        columns={[
          { key: 'name', header: 'Danh mục', render: (row) => <Typography fontWeight={700}>{row.name}</Typography> },
          { key: 'description', header: 'Mô tả', render: (row) => row.description || 'Chưa có mô tả' },
          { key: 'actions', header: 'Thao tác', align: 'center', width: 150, render: (row) => <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ flexWrap: 'nowrap', '& .MuiButton-root': { minWidth: 48, whiteSpace: 'nowrap', flexShrink: 0 } }}><Button disabled={busy} onClick={() => { setEditing(row); setName(row.name); setDescription(row.description ?? ''); }}>Sửa</Button><Button disabled={busy} color="error" onClick={() => setRemoving(row)}>Xóa</Button></Stack> },
        ]}
      />}</CardContent></Card>
    </Box>
    <Dialog open={!!removing} onClose={() => !busy && setRemoving(null)} aria-labelledby="delete-catalog-title">
      <DialogTitle id="delete-catalog-title">Xóa danh mục tin tức?</DialogTitle>
      <DialogContent>{removing?.name}</DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setRemoving(null)}>Hủy</Button><Button color="error" disabled={busy} onClick={() => void remove()}>Xóa</Button></DialogActions>
    </Dialog>
  </Stack>;
}
