import type { ReactNode } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export type AdminColumn<T> = {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
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
}: AdminDataTableProps<T>) {
  return (
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
          '& td': { fontSize: 14, py: 1.75, px: 2, overflowWrap: 'anywhere' },
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
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
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
  );
}
