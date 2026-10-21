import { describe, it, expect } from 'vitest';
import { atkinsonDither } from '../src/effects/atkinson.js';
import type { GrayscaleImage, DitherConfig } from '../src/types.js';

function makeImage(w: number, h: number, values: number[]): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(values) };
}

const BASE: DitherConfig = { threshold: 128, brightness: 0, contrast: 0, invert: false };

describe('atkinsonDither', () => {
  it('pure white stays white', () => {
    const img = makeImage(4, 4, new Array(16).fill(255));
    const result = atkinsonDither(img, BASE);
    expect(result.data.every((v) => v === 255)).toBe(true);
  });

  it('pure black stays black', () => {
    const img = makeImage(4, 4, new Array(16).fill(0));
    const result = atkinsonDither(img, BASE);
    expect(result.data.every((v) => v === 0)).toBe(true);
  });

  it('output values are strictly 0 or 255', () => {
    const img = makeImage(4, 4, [10, 50, 100, 150, 200, 230, 128, 64, 32, 180, 90, 210, 5, 250, 127, 130]);
    const result = atkinsonDither(img, BASE);
    for (const v of result.data) {
      expect(v === 0 || v === 255).toBe(true);
    }
  });
});
