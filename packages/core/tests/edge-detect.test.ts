import { describe, it, expect } from 'vitest';
import { sobelGradient } from '../src/utils/edge-detect.js';
import type { GrayscaleImage } from '../src/types.js';

function makeImage(w: number, h: number, values: number[]): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(values) };
}

describe('sobelGradient', () => {
  it('returns zero gradient for uniform image', () => {
    const img = makeImage(4, 4, Array(16).fill(128));
    const result = sobelGradient(img);
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.maxMagnitude).toBe(0);
    for (let i = 0; i < result.magnitudes.length; i++) {
      expect(result.magnitudes[i]).toBe(0);
    }
  });

  it('detects vertical edge (left black, right white)', () => {
    const img = makeImage(4, 4, [
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
    ]);
    const result = sobelGradient(img);
    const mag11 = result.magnitudes[1 * 4 + 1];
    const mag12 = result.magnitudes[1 * 4 + 2];
    expect(mag11).toBeGreaterThan(100);
    expect(mag12).toBeGreaterThan(100);
  });

  it('detects horizontal edge (top black, bottom white)', () => {
    const img = makeImage(4, 4, [
      0, 0, 0, 0,
      0, 0, 0, 0,
      255, 255, 255, 255,
      255, 255, 255, 255,
    ]);
    const result = sobelGradient(img);
    const mag11 = result.magnitudes[1 * 4 + 1];
    expect(mag11).toBeGreaterThan(100);
  });

  it('border pixels have zero gradient', () => {
    const img = makeImage(4, 4, [
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
    ]);
    const result = sobelGradient(img);
    expect(result.magnitudes[0]).toBe(0);
    expect(result.magnitudes[15]).toBe(0);
  });
});
