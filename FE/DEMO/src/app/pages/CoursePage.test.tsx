import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { CoursePage } from './CoursePage';

const course = vi.hoisted(() => vi.fn());
const reviews = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({ api: { course, reviews } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

describe('CoursePage', () => {
  it('renders the shared skeleton while course detail is pending', () => {
    course.mockImplementation(() => new Promise(() => {}));
    reviews.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/courses/seo-foundation']}>
        <Routes><Route path="/courses/:slug" element={<CoursePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Đang tải nội dung')).toBeInTheDocument();
  });
});
