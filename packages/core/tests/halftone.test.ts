import { describe, it, expect } from 'vitest';
import { halftoneEffect } from '../src/effects/halftone.js';
import type { GrayscaleImage, HalftoneConfig } from '../src/types.js';

function makeImage(w: number, h: number, values: number[]): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(values) };
}

const BASE: HalftoneConfig = { dotSpacing: 8, maxDotRadius: 4, angle: 0, brightness: 0, contrast: 0, invert: false };

describe('halftoneEffect', () => {
  it('pure white produces zero-radius dots', () => {
    const img = makeImage(16, 16, new Array(256).fill(255));
    const result = halftoneEffect(img, BASE);
    expect(result.dots.every((d) => d.radius === 0)).toBe(true);
  });

  it('pure black produces max-radius dots', () => {
    const img = makeImage(16, 16, new Array(256).fill(0));
    const result = halftoneEffect(img, BASE);
    expect(result.dots.every((d) => d.radius === BASE.maxDotRadius)).toBe(true);
  });

  it('produces correct number of dots', () => {
    const img = makeImage(16, 16, new Array(256).fill(128));
    const result = halftoneEffect(img, BASE);
    expect(result.dots.length).toBe(4); // 16/8 = 2 per axis
  });
});
