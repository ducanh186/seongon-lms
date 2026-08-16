import { afterEach, describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from './LocalStorageAdapter';

describe('LocalStorageAdapter', () => {
  afterEach(() => localStorage.clear());

  it('reads and writes JSON values through one persistence seam', () => {
    const storage = new LocalStorageAdapter();

    storage.write('session', { token: 'token-1' });

    expect(storage.read<{ token: string }>('session')).toEqual({ token: 'token-1' });
  });

  it('removes invalid JSON and returns null', () => {
    localStorage.setItem('broken', '{');
    const storage = new LocalStorageAdapter();

    expect(storage.read('broken')).toBeNull();
    expect(localStorage.getItem('broken')).toBeNull();
  });

  it('removes stored values', () => {
    const storage = new LocalStorageAdapter();
    storage.write('session', { token: 'token-1' });

    storage.remove('session');

    expect(storage.read('session')).toBeNull();
  });
});
