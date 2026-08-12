import { afterEach, describe, expect, it } from 'vitest';
import { readCart, writeCart, type CartItem } from './cartStorage';

const seoCourse: CartItem = {
  courseId: 10,
  slug: 'seo-foundation',
  title: 'SEO Foundation',
  price: '299000',
  thumbnail: null,
};

const adsCourse: CartItem = {
  courseId: 20,
  slug: 'google-ads',
  title: 'Google Ads',
  price: '199000',
  thumbnail: 'https://example.test/ads.png',
};

afterEach(() => localStorage.clear());

describe('cartStorage', () => {
  it('keeps cart items isolated by authenticated user id', () => {
    writeCart(1, [seoCourse]);
    writeCart(2, [adsCourse]);

    expect(readCart(1)).toEqual([seoCourse]);
    expect(readCart(2)).toEqual([adsCourse]);
  });

  it('collapses duplicate course ids before persisting a cart', () => {
    writeCart(1, [seoCourse, { ...seoCourse, title: 'Updated title' }, adsCourse]);

    expect(readCart(1)).toEqual([seoCourse, adsCourse]);
    expect(JSON.parse(localStorage.getItem('seongon-cart:user:1') ?? '[]')).toHaveLength(2);
  });

  it('removes a malformed stored cart and returns an empty cart', () => {
    localStorage.setItem('seongon-cart:user:1', '{not valid JSON');

    expect(readCart(1)).toEqual([]);
    expect(localStorage.getItem('seongon-cart:user:1')).toBeNull();
  });

  it('removes a stored cart when one entry has a stale non-numeric price', () => {
    localStorage.setItem('seongon-cart:user:1', JSON.stringify([
      seoCourse,
      { ...adsCourse, price: 'stale price' },
    ]));

    expect(readCart(1)).toEqual([]);
    expect(localStorage.getItem('seongon-cart:user:1')).toBeNull();
  });
});
