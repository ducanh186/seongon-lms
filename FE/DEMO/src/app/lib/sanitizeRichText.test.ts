import { describe, expect, it } from 'vitest';
import { sanitizeRichText } from './sanitizeRichText';

describe('sanitizeRichText', () => {
  it('keeps article blocks and removes scripts, handlers, and unsafe links', () => {
    const html = sanitizeRichText('<h2>Tiêu đề</h2><p onclick="alert(1)">Đoạn</p><img src="/storage/news-images/a.png" onerror="alert(1)"><a href="javascript:alert(1)">X</a><script>alert(1)</script>');

    expect(html).toContain('<h2>Tiêu đề</h2>');
    expect(html).toContain('<p>Đoạn</p>');
    expect(html).toContain('<img src="/storage/news-images/a.png">');
    expect(html).not.toContain('script');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
  });
});
