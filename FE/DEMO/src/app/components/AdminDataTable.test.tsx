import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminDataTable } from './AdminDataTable';

describe('AdminDataTable', () => {
  it('keeps the action column visible while the table scrolls horizontally', () => {
    render(
      <AdminDataTable
        label="Audit table"
        rows={[{ id: 1, name: 'Course A' }]}
        getRowKey={(row) => row.id}
        columns={[
          { key: 'name', header: 'Khóa học', render: (row) => row.name },
          { key: 'actions', header: 'Thao tác', align: 'right', render: () => 'Sửa' },
        ]}
        minWidth={1120}
        stickyFirstColumn
        stickyLastColumn
      />,
    );

    const table = screen.getByRole('table', { name: 'Audit table' });
    const actionHeader = within(table).getByRole('columnheader', { name: 'Thao tác' });
    const actionCell = within(table).getByRole('cell', { name: 'Sửa' });

    expect(actionHeader).toHaveStyle({ position: 'sticky', right: '0px' });
    expect(actionCell).toHaveStyle({ position: 'sticky', right: '0px' });
  });
});
