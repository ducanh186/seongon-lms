import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

  it('renders compact uppercase headers so wide tables fit without horizontal scroll', () => {
    render(
      <AdminDataTable
        label="Density table"
        rows={[{ id: 1, name: 'Course A' }]}
        getRowKey={(row) => row.id}
        columns={[{ key: 'name', header: 'Khóa học', render: (row) => row.name }]}
      />,
    );

    const table = screen.getByRole('table', { name: 'Density table' });
    expect(within(table).getByRole('columnheader', { name: 'Khóa học' })).toHaveStyle({
      fontSize: '12px',
      textTransform: 'uppercase',
    });
    expect(within(table).getByRole('cell', { name: 'Course A' })).toHaveStyle({ fontSize: '14px' });
  });

  it('keeps column headers visible while a long table scrolls', () => {
    render(
      <AdminDataTable
        label="Sticky header table"
        rows={[{ id: 1, name: 'Course A' }]}
        getRowKey={(row) => row.id}
        columns={[{ key: 'name', header: 'Khóa học', render: (row) => row.name }]}
      />,
    );

    expect(within(screen.getByRole('table', { name: 'Sticky header table' })).getByRole('columnheader', { name: 'Khóa học' })).toHaveStyle({
      position: 'sticky',
      top: '0px',
    });
  });

  it('shows result count, page size controls, and sort labels', async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    const onSortChange = vi.fn();
    render(
      <AdminDataTable
        label="Danh sách khóa học"
        rows={[{ id: 1, name: 'Course A' }]}
        totalCount={47}
        page={2}
        pageSize={15}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
        onSortChange={onSortChange}
        getRowKey={(row) => row.id}
        columns={[{ key: 'name', header: 'Khóa học', sortable: true, sortValue: (row) => row.name, render: (row) => row.name }]}
      />,
    );

    expect(screen.getByText('Hiển thị 16-30 trong 47 danh sách khóa học')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Khóa học/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' });
    await user.click(screen.getByRole('combobox', { name: 'Số dòng' }));
    await user.click(screen.getByRole('option', { name: '25 / trang' }));
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });
});
