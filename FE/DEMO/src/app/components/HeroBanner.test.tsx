import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ApiCourse } from '../lib/contracts';
import { HeroBanner } from './HeroBanner';

describe('HeroBanner', () => {
  it('loads an uploaded featured-course thumbnail from the Laravel origin', () => {
    const course = {
      id: 10,
      title: 'SEO Foundation',
      slug: 'seo-foundation',
      thumbnail: '/storage/course-images/featured.jpg',
    } as ApiCourse;

    const { container } = render(<MemoryRouter><HeroBanner courses={[course]} /></MemoryRouter>);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'http://127.0.0.1:8000/storage/course-images/featured.jpg',
    );
  });
});
