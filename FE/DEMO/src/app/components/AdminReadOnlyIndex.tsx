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
  Typography,
} from '@mui/material';
import type { Paginated } from '../lib/contracts';
import { EmptyState, PageSkeleton, RequestError } from './AsyncState';
import { AdminDataTable, type AdminColumn } from './AdminDataTable';
import { AdminFilterToolbar } from './AdminFilterToolbar';

export type AdminReadFilter = {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'date' | 'select';
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
  fixedLayout?: boolean;
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
  fixedLayout = false,
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
      if (value === '') {
        next[filter.key] = undefined;
        continue;
      }
      if (numberKeys.has(filter.key)) {
        // Identifier controls are plain text inputs (no spinner), so anything can
        // be typed. Number('abc') is NaN, which would serialise as `?id=NaN` and
        // make the API 422 the whole section — drop it instead.
        const parsed = Number(value);
        next[filter.key] = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
        continue;
      }
      next[filter.key] = value;
    }
    setApplied(next);
  };

  return (
    <Card sx={{ borderRadius: 3, minWidth: 0 }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {/* Title + filters form the card's top band, joined to the table by a
            single divider — the prototype's .table-toolbar + .data-table pattern.
            The band keeps its own surface, so the filter bar still reads as a
            distinct area without nesting a second border inside the card. */}
        <Stack spacing={2} sx={{ minWidth: 0, p: 2.5, bgcolor: '#F8FBFC', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography component="h2" variant="h6" fontWeight={800}>{label}</Typography>
          {filters.length > 0 && (
            <AdminFilterToolbar
              label={'Bộ lọc ' + label.toLowerCase()}
              action={<Button variant="contained" onClick={applyFilters}>Áp dụng</Button>}
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
              // `number` filters are identifiers, not quantities: a spinner on an
              // ID reads as "increment this record", so keep a text control with
              // a numeric keypad hint instead.
              type={filter.kind === 'date' ? 'date' : 'text'}
              inputProps={filter.kind === 'number' ? { inputMode: 'numeric', pattern: '[0-9]*' } : undefined}
              InputLabelProps={filter.kind === 'date' ? { shrink: true } : undefined}
              value={drafts[filter.key] ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                const value = filter.kind === 'number' ? raw.replace(/[^0-9]/g, '') : raw;
                setDrafts((current) => ({ ...current, [filter.key]: value }));
              }}
              fullWidth
            />
          ))}
        </AdminFilterToolbar>
      )}

        </Stack>

        {(error || loading) && (
          <Box sx={{ p: 2.5 }}>
            {error && <RequestError message={error} onRetry={() => void load()} />}
            {loading && <PageSkeleton rows={4} />}
          </Box>
        )}

        {!loading && !error && (
          data?.data.length ? (
            <AdminDataTable<T>
              label={label}
              rows={data.data}
              columns={columns}
              getRowKey={getRowKey}
              minWidth={minWidth}
              fixedLayout={fixedLayout}
            />
          ) : (
            <Box sx={{ p: 2.5 }}><EmptyState title={emptyTitle} /></Box>
          )
        )}

        {data && data.meta.last_page > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={data.meta.last_page}
              page={Number(applied.page ?? 1)}
              onChange={(_, page) => setApplied((current) => ({ ...current, page }))}
              color="primary"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
