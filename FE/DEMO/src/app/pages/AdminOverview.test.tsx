import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ApiAdminStats } from '../lib/contracts';
import { AdminOverview } from './AdminOverview';

const stats: ApiAdminStats = {
  students: 25,
  courses: 12,
  published_courses: 9,
  enrollments: 40,
  certificates: 10,
  completion_rate: 25,
  revenue: 12500000,
  monthly_enrollments: [
    { month: '2026-07', total: 12 },
    { month: '2026-08', total: 18 },
  ],
  popular_courses: [
    { id: 1, title: 'SEO thực chiến', enrollments_count: 14 },
    { id: 2, title: 'Google Ads', enrollments_count: 9 },
  ],
};

describe('AdminOverview', () => {
  it('renders real KPI, accessible monthly values, and popular course ranking', () => {
    render(<AdminOverview stats={stats} />);

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('12.500.000 đ')).toBeInTheDocument();
    expect(screen.getByTestId('admin-kpi-strip')).toHaveStyle({ display: 'grid' });
    expect(screen.getByTestId('admin-kpi-strip').querySelectorAll('.MuiCard-root')).toHaveLength(0);
    const enrollmentChart = screen.getByRole('img', { name: 'Biểu đồ ghi danh theo tháng' });
    expect(enrollmentChart).toHaveTextContent('2026-07: 12 lượt ghi danh');
    expect(enrollmentChart).toHaveStyle({ minHeight: '190px' });
    expect(screen.getByText('2026-07: 12 lượt ghi danh')).toHaveAttribute('data-visually-hidden', 'true');
    expect(screen.getByText('07/26')).toHaveStyle({ writingMode: 'horizontal-tb' });
    const popularCoursesTable = screen.getByRole('table', { name: 'Khóa học phổ biến' });
    expect(popularCoursesTable).toHaveTextContent('SEO thực chiến');
    expect(popularCoursesTable).toHaveTextContent('01');
    expect(popularCoursesTable).toHaveStyle({ tableLayout: 'fixed', width: '100%' });
    expect(screen.getByTestId('popular-courses-table-container')).toHaveStyle({ maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto', overflowX: 'auto' });
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByTestId('completion-rate-card')).toHaveStyle({ alignSelf: 'start', width: '100%' });
    expect(screen.getByText('Dữ liệu trực tiếp từ hệ thống')).toBeInTheDocument();
    expect(screen.queryByText(/ERD_PENDING/)).not.toBeInTheDocument();
  });

  it('renders explicit empty states for zero series and rankings', () => {
    render(<AdminOverview stats={{ ...stats, monthly_enrollments: [], popular_courses: [] }} />);

    expect(screen.getByText('Chưa có dữ liệu ghi danh theo tháng.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có khóa học được ghi danh.')).toBeInTheDocument();
  });
});
