import { describe, expect, it } from 'vitest';
import { code128BSvgDataUrl } from '@/lib/code128';

describe('local Code 128 renderer', () => {
  it('returns a local SVG data URL without external requests', () => {
    const result = code128BSvgDataUrl('SPC_TEST_0123456789');
    expect(result).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(result)).toContain('<rect');
  });

  it('rejects empty, non-ASCII and excessively long values', () => {
    expect(() => code128BSvgDataUrl('')).toThrow();
    expect(() => code128BSvgDataUrl('mã-vạch')).toThrow();
    expect(() => code128BSvgDataUrl('X'.repeat(81))).toThrow();
  });
});
