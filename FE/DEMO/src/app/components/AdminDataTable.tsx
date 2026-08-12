import type { ReactNode } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export type AdminColumn<T> = {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
};

interface AdminDataTableProps<T> {
  label: string;
  columns: AdminColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  minWidth?: number;
  stickyFirstColumn?: boolean;
  stickyLastColumn?: boolean;
}

export function AdminDataTable<T>({
  label,
  columns,
  rows,
  getRowKey,
  minWidth = 680,
  stickyFirstColumn = true,
  stickyLastColumn = false,
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
          '& th': { whiteSpace: 'nowrap', fontWeight: 800, bgcolor: 'grey.50' },
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
              <TableCell key={column.key} align={column.align} scope="col">
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowKey(row)} hover>
              {columns.map((column) => (
                <TableCell key={column.key} align={column.align}>
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
