import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminEntityPage } from './AdminEntityPage';

describe('AdminEntityPage', () => {
  it('provides a reusable placeholder without fabricating entity fields', () => {
    render(<AdminEntityPage title="Quản lý ghi danh" status="placeholder" />);

    expect(screen.getByRole('heading', { name: 'Quản lý ghi danh' })).toBeInTheDocument();
    expect(screen.getByText('Chức năng đang chờ đối chiếu ERD chính thức.')).toBeInTheDocument();
    expect(screen.getByText('Dữ liệu hiện tại chỉ phục vụ prototype.')).toBeInTheDocument();
  });

  it('renders supplied filters, content and pagination without owning business logic', () => {
    render(
      <AdminEntityPage
        title="Danh sách"
        status="ready"
        filters={<label>Tìm kiếm<input /></label>}
        pagination={<button>Trang sau</button>}
      >
        <table aria-label="Dữ liệu"><tbody><tr><td>Một dòng</td></tr></tbody></table>
      </AdminEntityPage>,
    );

    expect(screen.getByRole('textbox', { name: 'Tìm kiếm' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Dữ liệu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeInTheDocument();
  });
});
