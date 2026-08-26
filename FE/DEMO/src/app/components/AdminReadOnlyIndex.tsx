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

  // Identifiers and dates need far less room than names: sizing every control
  // at 1fr is what pushed the filter bar onto three rows.
  const weightFor = (kind: AdminReadFilter['kind']) =>
    kind === 'number' ? 0.62 : kind === 'date' ? 0.8 : kind === 'select' ? 0.85 : 1.25;
  const weights = filters.map((filter) => weightFor(filter.kind));
  // CSS grid scales rather than distributes when the fr factors sum below 1, which
  // would leave dead space (e.g. a lone `number` filter using 62% of the row).
  const weightSum = weights.reduce((total, weight) => total + weight, 0);
  const scale = weightSum > 0 && weightSum < 1 ? 1 / weightSum : 1;
  const oneRowTemplate = `${weights.map((weight) => `minmax(0, ${(weight * scale).toFixed(3)}fr)`).join(' ')} auto`;

  return (
    <Card sx={{ borderRadius: 3, minWidth: 0 }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Stack spacing={2} sx={{ minWidth: 0, p: 2.5, pb: filters.length > 0 || error || loading ? 2.5 : 0 }}>
          <Typography component="h2" variant="h6" fontWeight={800}>{label}</Typography>
          {filters.length > 0 && (
            <Box
              component="section"
              role="region"
              aria-label={'Bộ lọc ' + label.toLowerCase()}
              data-admin-toolbar="true"
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr)) auto',
                  lg: oneRowTemplate,
                },
                gap: 1.25,
                alignItems: 'stretch',
                // Inside the card, but still a distinct surface: the acceptance
                // checklist requires the filter bar to read as its own panel.
                p: 1.75,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.5,
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
          <Button variant="contained" onClick={applyFilters}>Áp dụng</Button>
        </Box>
      )}

          {error && <RequestError message={error} onRetry={() => void load()} />}
          {loading && <PageSkeleton rows={4} />}
        </Stack>

        {!loading && !error && (
          data?.data.length ? (
            <AdminDataTable<T>
              label={label}
              rows={data.data}
              columns={columns}
              getRowKey={getRowKey}
              minWidth={minWidth}
            />
          ) : (
            <Box sx={{ p: 2.5, pt: 0 }}><EmptyState title={emptyTitle} /></Box>
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
