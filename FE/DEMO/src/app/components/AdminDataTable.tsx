import type { ReactNode } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Pagination, Select, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from '@mui/material';

export type AdminSortDirection = 'asc' | 'desc';
export type AdminSortState = { key: string; direction: AdminSortDirection };

export type AdminColumn<T> = {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  render: (row: T) => ReactNode;
};

interface AdminDataTableProps<T> {
  label: string;
  columns: AdminColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  minWidth?: number;
  fixedLayout?: boolean;
  cellPaddingX?: number;
  stickyFirstColumn?: boolean;
  stickyLastColumn?: boolean;
  onRowClick?: (row: T) => void;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading?: boolean;
  sort?: AdminSortState;
  onSortChange?: (sort: AdminSortState) => void;
}

export function AdminDataTable<T>({
  label,
  columns,
  rows,
  getRowKey,
  minWidth = 680,
  fixedLayout = false,
  cellPaddingX,
  stickyFirstColumn = true,
  stickyLastColumn = false,
  onRowClick,
  totalCount,
  page = 1,
  pageSize = 15,
  pageSizeOptions = [15, 25, 50],
  onPageChange,
  onPageSizeChange,
  loading = false,
  sort,
  onSortChange,
}: AdminDataTableProps<T>) {
  const visibleTotal = totalCount ?? rows.length;
  const firstResult = visibleTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, visibleTotal);
  const sortedRows = sort?.key
    ? [...rows].sort((left, right) => {
        const column = columns.find((candidate) => candidate.key === sort.key);
        const leftValue = column?.sortValue?.(left) ?? '';
        const rightValue = column?.sortValue?.(right) ?? '';
        const comparison = String(leftValue).localeCompare(String(rightValue), 'vi', { numeric: true, sensitivity: 'base' });
        return sort.direction === 'asc' ? comparison : -comparison;
      })
    : rows;

  const handleSort = (column: AdminColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    onSortChange({
      key: column.key,
      direction: sort?.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <Stack spacing={1.25}>
      <TableContainer
        component={Box}
        role="region"
        tabIndex={0}
        aria-label={`${label}, có thể cuộn ngang`}
        sx={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          '&:focus-visible': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Table
        stickyHeader
        size="small"
        aria-label={label}
        sx={{
          minWidth,
          width: '100%',
          tableLayout: fixedLayout ? 'fixed' : 'auto',
          // Density copied from the prototype's .data-table: small uppercase
          // headers keep wide tables inside the viewport without scrolling.
          '& th': {
            whiteSpace: 'nowrap',
            bgcolor: 'grey.50',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            color: 'text.secondary',
            py: 1.5,
            px: 2,
          },
          '& td': { fontSize: 14, py: 1.75, px: 2, overflowWrap: 'normal' },
          '& td .MuiChip-label': { whiteSpace: 'nowrap' },
          ...(fixedLayout && {
            '& th, & td': { px: cellPaddingX ?? 1.25 },
            '& td .MuiTypography-root': { fontSize: 14 },
          }),
          ...(stickyFirstColumn && {
            '& th:first-of-type, & td:first-of-type': {
              position: 'sticky',
              left: 0,
              zIndex: 1,
              bgcolor: 'background.paper',
            },
            '& th:first-of-type': { zIndex: 2, bgcolor: 'grey.50' },
          }),
          ...(stickyLastColumn && {
            '& th:last-of-type, & td:last-of-type': {
              position: 'sticky',
              right: 0,
              zIndex: 1,
              bgcolor: 'background.paper',
              boxShadow: '-1px 0 0 rgba(15, 58, 68, 0.12)',
            },
            '& th:last-of-type': { zIndex: 2, bgcolor: 'grey.50' },
          }),
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align} scope="col" sx={{ width: column.width, ...(cellPaddingX !== undefined ? { px: cellPaddingX } : {}) }}>
                {column.sortable ? <TableSortLabel
                  active={sort?.key === column.key}
                  direction={sort?.key === column.key ? sort.direction : 'asc'}
                  onClick={() => handleSort(column)}
                >{column.header}</TableSortLabel> : column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
            <TableRow key={`loading-${index}`} aria-label="Đang tải dữ liệu">
              {columns.map((column) => <TableCell key={column.key}><Skeleton variant="text" width="80%" /></TableCell>)}
            </TableRow>
          )) : sortedRows.map((row) => (
            <TableRow
              key={getRowKey(row)}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => {
                // Row-level Enter/Space must not swallow keystrokes aimed at a
                // control inside the row (e.g. the "Thao tác" menu button).
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(row);
                }
              } : undefined}
              // Feedback asked for the gray hover to go, not for clickable rows to
              // lose all feedback: interactive rows get a faint primary tint instead.
              sx={onRowClick ? { cursor: 'pointer', '&:hover': { bgcolor: 'rgba(0,137,148,.06)' }, '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: -3 } } : undefined}
            >
              {columns.map((column) => (
                <TableCell key={column.key} align={column.align} sx={cellPaddingX !== undefined ? { px: cellPaddingX } : undefined}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </TableContainer>
      {(totalCount !== undefined || onPageSizeChange || onPageChange) && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ px: 0.5 }}>
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {visibleTotal === 0 ? `Không có ${label.toLowerCase()}.` : `Hiển thị ${firstResult}-${lastResult} trong ${visibleTotal} ${label.toLowerCase()}`}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {onPageSizeChange && <FormControl size="small" sx={{ minWidth: 112 }}>
            <InputLabel id={`${label.replace(/\s+/g, '-')}-page-size`}>Số dòng</InputLabel>
            <Select labelId={`${label.replace(/\s+/g, '-')}-page-size`} label="Số dòng" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {pageSizeOptions.map((option) => <MenuItem key={option} value={option}>{option} / trang</MenuItem>)}
            </Select>
          </FormControl>}
          {onPageChange && visibleTotal > pageSize && <Pagination count={Math.ceil(visibleTotal / pageSize)} page={page} onChange={(_, nextPage) => onPageChange(nextPage)} size="small" color="primary" />}
        </Stack>
      </Stack>}
    </Stack>
  );
}
