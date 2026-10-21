import { describe, it, expect } from 'vitest';
import { bayerDither } from '../src/effects/bayer.js';
import type { GrayscaleImage, BayerConfig } from '../src/types.js';

function makeImage(w: number, h: number, values: number[]): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(values) };
}

const BASE: BayerConfig = { matrixSize: 4, brightness: 0, contrast: 0, invert: false };

describe('bayerDither', () => {
  it('pure white stays white', () => {
    const img = makeImage(4, 4, new Array(16).fill(255));
    const result = bayerDither(img, BASE);
    expect(result.data.every((v) => v === 255)).toBe(true);
  });

  it('pure black stays black', () => {
    const img = makeImage(4, 4, new Array(16).fill(0));
    const result = bayerDither(img, BASE);
    expect(result.data.every((v) => v === 0)).toBe(true);
  });

  it('output values are strictly 0 or 255', () => {
    const img = makeImage(8, 8, Array.from({ length: 64 }, (_, i) => (i * 4) % 256));
    const result = bayerDither(img, BASE);
    for (const v of result.data) {
      expect(v === 0 || v === 255).toBe(true);
    }
  });

  it('supports 2x2 and 8x8', () => {
    const img = makeImage(8, 8, new Array(64).fill(128));
    expect(bayerDither(img, { ...BASE, matrixSize: 2 }).data.length).toBe(64);
    expect(bayerDither(img, { ...BASE, matrixSize: 8 }).data.length).toBe(64);
  });
});
