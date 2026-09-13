import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ApiCourse } from '../lib/contracts';
import { CourseCard } from './CourseCard';

describe('CourseCard', () => {
  it('loads an uploaded course thumbnail from the Laravel origin', () => {
    const course = {
      id: 10,
      category_id: 1,
      title: 'SEO Foundation',
      slug: 'seo-foundation',
      description: null,
      thumbnail: '/storage/course-images/seo.jpg',
      price: '299000.00',
      instructor_name: null,
      instructor_bio: null,
      level: 'beginner',
      status: 'published',
      created_at: '2026-07-10T00:00:00Z',
    } as ApiCourse;

    const { container } = render(<MemoryRouter><CourseCard course={course} /></MemoryRouter>);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'http://127.0.0.1:8000/storage/course-images/seo.jpg',
    );
    expect(screen.getByRole('article', { name: 'Khóa học SEO Foundation' })).toBeInTheDocument();
  });
});
