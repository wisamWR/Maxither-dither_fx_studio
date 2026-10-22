// packages/core/tests/resize.test.ts
import { describe, it, expect } from 'vitest';
import { resizeGray } from '../src/utils/resize.js';
import type { GrayscaleImage } from '../src/types.js';

function makeImg(w: number, h: number, fill: number | number[]): GrayscaleImage {
  const data = new Uint8Array(w * h);
  if (typeof fill === 'number') {
    data.fill(fill);
  } else {
    for (let i = 0; i < data.length; i++) data[i] = fill[i] ?? 0;
  }
  return { width: w, height: h, data };
}

describe('resizeGray', () => {
  it('averages 2×2 down to 1×1', () => {
    const img = makeImg(2, 2, [100, 200, 50, 150]);
    const out = resizeGray(img, 1, 1, 'stretch');
    expect(out.width).toBe(1);
    expect(out.height).toBe(1);
    expect(out.data[0]).toBe(125); // (100+200+50+150)/4
  });

  it('contain preserves aspect and pads with padValue', () => {
    const img = makeImg(4, 2, 100);
    const out = resizeGray(img, 4, 4, 'contain', 0);
    expect(out.width).toBe(4);
    expect(out.height).toBe(4);
    const row0avg = (out.data[0] + out.data[1] + out.data[2] + out.data[3]) / 4;
    const row1avg = (out.data[4] + out.data[5] + out.data[6] + out.data[7]) / 4;
    expect(row0avg).toBe(0);
    expect(row1avg).toBeGreaterThan(50);
  });

  it('cover crops center', () => {
    const pixels = [];
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        pixels.push(y < 2 ? 50 : 200);
    const img = makeImg(4, 4, pixels);
    const out = resizeGray(img, 4, 2, 'cover');
    expect(out.width).toBe(4);
    expect(out.height).toBe(2);
  });

  it('stretch distorts freely', () => {
    const img = makeImg(4, 2, 100);
    const out = resizeGray(img, 2, 4, 'stretch');
    expect(out.width).toBe(2);
    expect(out.height).toBe(4);
    expect(out.data.length).toBe(8);
  });

  it('identity returns same data', () => {
    const img = makeImg(3, 3, [10, 20, 30, 40, 50, 60, 70, 80, 90]);
    const out = resizeGray(img, 3, 3, 'stretch');
    expect(out.width).toBe(3);
    expect(out.data).toEqual(img.data);
  });

  it('handles non-divisible dimensions', () => {
    const img = makeImg(7, 5, 128);
    const out = resizeGray(img, 3, 3, 'stretch');
    expect(out.width).toBe(3);
    expect(out.height).toBe(3);
    expect(out.data.length).toBe(9);
    for (const v of out.data) {
      expect(v).toBeGreaterThanOrEqual(120);
      expect(v).toBeLessThanOrEqual(136);
    }
  });

  it('height=0 auto-computes from aspect ratio', () => {
    const img = makeImg(200, 100, 128);
    const out = resizeGray(img, 50, 0, 'stretch');
    expect(out.width).toBe(50);
    expect(out.height).toBe(25);
  });
});
