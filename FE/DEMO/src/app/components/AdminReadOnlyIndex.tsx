import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { Paginated } from '../lib/contracts';
import { EmptyState, PageSkeleton, RequestError } from './AsyncState';
import { AdminDataTable, type AdminColumn } from './AdminDataTable';

export type AdminReadFilter = {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
};

export type AdminReadOnlyIndexProps<T> = {
  token: string;
  label: string;
  emptyTitle: string;
  filters: AdminReadFilter[];
  loader: (
    token: string,
    filters: Record<string, string | number | undefined>,
  ) => Promise<Paginated<T>>;
  columns: AdminColumn<T>[];
  getRowKey: (row: T) => string | number;
  minWidth?: number;
};

function initialDrafts(filters: AdminReadFilter[]): Record<string, string> {
  return Object.fromEntries(filters.map((filter) => [filter.key, '']));
}

export function AdminReadOnlyIndex<T>({
  token,
  label,
  emptyTitle,
  filters,
  loader,
  columns,
  getRowKey,
  minWidth = 920,
}: AdminReadOnlyIndexProps<T>) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() => initialDrafts(filters));
  const [applied, setApplied] = useState<Record<string, string | number | undefined>>({ page: 1 });
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const numberKeys = useMemo(
    () => new Set(filters.filter((filter) => filter.kind === 'number').map((filter) => filter.key)),
    [filters],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader(token, applied));
    } catch {
      setError('Không thể tải dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  }, [applied, loader, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    const next: Record<string, string | number | undefined> = { page: 1 };
    for (const filter of filters) {
      const value = drafts[filter.key]?.trim() ?? '';
      next[filter.key] = value === ''
        ? undefined
        : numberKeys.has(filter.key) ? Number(value) : value;
    }
    setApplied(next);
  };

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      {filters.length > 0 && (
        <Box
          component="section"
          role="region"
          aria-label={'Bộ lọc ' + label.toLowerCase()}
          data-admin-toolbar="true"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr)) auto',
            gap: 2,
            alignItems: 'stretch',
            p: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          {filters.map((filter) => filter.kind === 'select' ? (
            <FormControl key={filter.key} fullWidth>
              <InputLabel id={filter.key + '-filter-label'}>{filter.label}</InputLabel>
              <Select
                labelId={filter.key + '-filter-label'}
                label={filter.label}
                value={drafts[filter.key] ?? ''}
                onChange={(event) => setDrafts((current) => ({ ...current, [filter.key]: event.target.value }))}
              >
                <MenuItem value="">Tất cả</MenuItem>
                {filter.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              key={filter.key}
              label={filter.label}
              type={filter.kind === 'number' ? 'number' : 'text'}
              inputProps={filter.kind === 'number' ? { min: 1 } : undefined}
              value={drafts[filter.key] ?? ''}
              onChange={(event) => setDrafts((current) => ({ ...current, [filter.key]: event.target.value }))}
              fullWidth
            />
          ))}
          <Button variant="contained" onClick={applyFilters}>Áp dụng</Button>
        </Box>
      )}

      {error && <RequestError message={error} onRetry={() => void load()} />}
      {loading && <PageSkeleton rows={4} />}
      {!loading && !error && (
        <Card sx={{ minWidth: 0 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {data?.data.length ? (
              <AdminDataTable<T>
                label={label}
                rows={data.data}
                columns={columns}
                getRowKey={getRowKey}
                minWidth={minWidth}
              />
            ) : (
              <EmptyState title={emptyTitle} />
            )}
          </CardContent>
        </Card>
      )}

      {data && data.meta.last_page > 1 && (
        <Pagination
          count={data.meta.last_page}
          page={Number(applied.page ?? 1)}
          onChange={(_, page) => setApplied((current) => ({ ...current, page }))}
          color="primary"
          sx={{ alignSelf: 'center' }}
        />
      )}
    </Stack>
  );
}
