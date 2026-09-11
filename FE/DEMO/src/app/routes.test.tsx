import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { router } from './routes';

describe('application routes', () => {
  it('matches forgot password as a public route instead of the wildcard redirect', () => {
    const matches = matchRoutes(router.routes, '/forgot-password');

    expect(matches?.at(-1)?.route.path).toBe('forgot-password');
  });
});
