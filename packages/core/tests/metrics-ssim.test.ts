// packages/core/tests/metrics-ssim.test.ts
import { describe, it, expect } from 'vitest';
import { mse, psnr, ssim } from '../src/metrics/ssim.js';
import type { GrayscaleImage } from '../src/types.js';

function makeImg(w: number, h: number, fill: number | ((x: number, y: number) => number)): GrayscaleImage {
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      data[y * w + x] = typeof fill === 'number' ? fill : Math.round(fill(x, y));
    }
  }
  return { width: w, height: h, data };
}

describe('mse', () => {
  it('identical images → 0', () => {
    const img = makeImg(16, 16, 128);
    expect(mse(img, img)).toBe(0);
  });
});

describe('psnr', () => {
  it('identical images → Infinity', () => {
    const img = makeImg(16, 16, 128);
    expect(psnr(img, img)).toBe(Infinity);
  });
});

describe('ssim', () => {
  it('identical images → 1.0', () => {
    const img = makeImg(32, 32, (x, y) => (x + y) * 4);
    expect(ssim(img, img)).toBeCloseTo(1.0, 4);
  });

  it('all-black vs all-white → low SSIM', () => {
    const black = makeImg(32, 32, 0);
    const white = makeImg(32, 32, 255);
    expect(ssim(black, white)).toBeLessThan(0.1);
  });

  it('noise produces intermediate SSIM', () => {
    const a = makeImg(32, 32, (x, y) => (x * 8 + y * 8) % 256);
    const b = makeImg(32, 32, (x, y) => ((x * 8 + y * 8) % 256 + 30) % 256);
    const s = ssim(a, b);
    expect(s).toBeGreaterThan(0.1);
    expect(s).toBeLessThan(0.99);
  });

  it('symmetric: ssim(a,b) === ssim(b,a)', () => {
    const a = makeImg(32, 32, (x, y) => x * 8);
    const b = makeImg(32, 32, (x, y) => y * 8);
    expect(ssim(a, b)).toBeCloseTo(ssim(b, a), 10);
  });

  it('dimension mismatch throws', () => {
    const a = makeImg(32, 32, 128);
    const b = makeImg(16, 16, 128);
    expect(() => ssim(a, b)).toThrow();
  });

  it('image too small for window returns null', () => {
    const a = makeImg(6, 6, 128);
    expect(ssim(a, a)).toBeNull();
  });

  it('custom window size', () => {
    const img = makeImg(32, 32, (x, y) => (x + y) * 4);
    const s = ssim(img, img, 5);
    expect(s).toBeCloseTo(1.0, 4);
  });

  it('gradient pair produces expected range', () => {
    const a = makeImg(32, 32, (x) => x * 8);
    const b = makeImg(32, 32, (x) => Math.min(x * 8 + 20, 255));
    const s = ssim(a, b);
    expect(s).toBeGreaterThan(0.5);
    expect(s).toBeLessThan(1.0);
  });
});
