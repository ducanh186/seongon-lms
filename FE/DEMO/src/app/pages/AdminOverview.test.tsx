import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ApiAdminStats } from '../lib/contracts';
import { AdminOverview } from './AdminOverview';

const stats: ApiAdminStats = {
  students: 25,
  courses: 12,
  published_courses: 9,
  draft_courses: 3,
  enrollments: 40,
  certificates: 10,
  completion_rate: 25,
  revenue: 12500000,
  monthly_enrollments: [
    { month: '2026-04', total: 2 },
    { month: '2026-05', total: 3 },
    { month: '2026-06', total: 5 },
    { month: '2026-07', total: 12 },
    { month: '2026-08', total: 18 },
    { month: '2026-09', total: 0 },
  ],
  popular_courses: [
    { id: 1, title: 'SEO thực chiến', enrollments_count: 14 },
    { id: 2, title: 'Google Ads', enrollments_count: 9 },
  ],
};

describe('AdminOverview', () => {
  it('offers enrollment and revenue report exports from one dropdown', async () => {
    const onExportReport = vi.fn();
    const user = userEvent.setup();
    render(<AdminOverview stats={stats} onExportReport={onExportReport} />);

    await user.click(screen.getByRole('button', { name: 'Xuất báo cáo' }));
    await user.click(screen.getByRole('menuitem', { name: 'Báo cáo ghi danh' }));
    expect(onExportReport).toHaveBeenCalledWith('enrollments');

    await user.click(screen.getByRole('button', { name: 'Xuất báo cáo' }));
    await user.click(screen.getByRole('menuitem', { name: 'Báo cáo doanh thu' }));
    expect(onExportReport).toHaveBeenCalledWith('revenue');
  });

  it('renders API ranking and genuine ties without inventing extra courses or counts', () => {
    render(<AdminOverview stats={{ ...stats, popular_courses: [
      { id: 21, title: 'First course', enrollments_count: 84 },
      { id: 33, title: 'Second course', enrollments_count: 9 },
      { id: 47, title: 'Third course', enrollments_count: 9 },
    ] }} />);

    const rows = within(screen.getByRole('table', { name: 'Khóa học phổ biến' })).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[1]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['01', 'First course', '84']);
    expect(within(rows[2]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['02', 'Second course', '9']);
    expect(within(rows[3]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['03', 'Third course', '9']);
  });

  it('fills the dashboard summary with real published and draft course counts', () => {
    render(<AdminOverview stats={stats} />);
    const summary = screen.getByRole('region', { name: 'Trạng thái khóa học' });
    expect(summary).toHaveTextContent('9 / 12');
    expect(summary).toHaveTextContent('3 bản nháp');
  });

  it('renders real KPI, accessible monthly values, and popular course ranking', () => {
    render(<AdminOverview stats={stats} />);

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('12.500.000 đ')).toBeInTheDocument();
    expect(screen.getByTestId('admin-kpi-strip')).toHaveStyle({ display: 'grid' });
    expect(screen.getByTestId('admin-kpi-strip').querySelectorAll('.MuiCard-root')).toHaveLength(0);
    const enrollmentChart = screen.getByRole('img', { name: 'Biểu đồ ghi danh theo tháng' });
    expect(screen.getByRole('heading', { name: 'Ghi danh 6 tháng gần nhất' })).toBeInTheDocument();
    expect(enrollmentChart).toHaveStyle({ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' });
    expect(enrollmentChart).toHaveTextContent('2026-07: 12 lượt ghi danh');
    expect(enrollmentChart).toHaveStyle({ minHeight: '190px' });
    expect(screen.getByText('2026-07: 12 lượt ghi danh')).toHaveAttribute('data-visually-hidden', 'true');
    expect(screen.getByText('07/2026')).toHaveStyle({ writingMode: 'horizontal-tb' });
    const popularCoursesTable = screen.getByRole('table', { name: 'Khóa học phổ biến' });
    expect(popularCoursesTable).toHaveTextContent('SEO thực chiến');
    expect(popularCoursesTable).toHaveTextContent('01');
    expect(popularCoursesTable).toHaveStyle({ tableLayout: 'fixed', width: '100%' });
    expect(screen.getByTestId('popular-courses-table-container')).toHaveStyle({ maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto', overflowX: 'auto' });
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByTestId('completion-rate-card')).toHaveStyle({ alignSelf: 'start', width: '100%' });
    expect(screen.queryByText('Dữ liệu trực tiếp từ hệ thống')).not.toBeInTheDocument();
    expect(screen.queryByText(/ERD_PENDING/)).not.toBeInTheDocument();
  });

  it('does not apply a gray hover background to popular course rows', () => {
    render(<AdminOverview stats={stats} />);

    const rows = screen.getByRole('table', { name: 'Khóa học phổ biến' }).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row.className).not.toMatch(/MuiTableRow-hover/));
  });

  it('renders explicit empty states for zero series and rankings', () => {
    render(<AdminOverview stats={{ ...stats, monthly_enrollments: [], popular_courses: [] }} />);

    expect(screen.getByText('Chưa có dữ liệu ghi danh theo tháng.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có khóa học được ghi danh.')).toBeInTheDocument();
  });
});
