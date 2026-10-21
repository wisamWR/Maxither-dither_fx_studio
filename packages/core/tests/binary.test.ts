import { describe, it, expect } from 'vitest';
import { binaryEffect } from '../src/effects/binary.js';
import type { GrayscaleImage, BinaryConfig } from '../src/types.js';

function makeImage(w: number, h: number, values: number[]): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(values) };
}

const BASE: BinaryConfig = { cols: 4, threshold: 128, brightness: 0, contrast: 0, invert: false };

describe('binaryEffect', () => {
  it('converts bright to 1 and dark to 0', () => {
    // 4×4 image: top half bright, bottom half dark
    // cols=4, blockW=1, blockH=2 → 2 rows
    const img = makeImage(4, 4, [
      200, 200, 200, 200,
      200, 200, 200, 200,
      50,  50,  50,  50,
      50,  50,  50,  50,
    ]);
    const result = binaryEffect(img, { ...BASE, cols: 4 });
    const lines = result.text.split('\n');
    expect(lines[0]).toBe('1111');
    expect(lines[1]).toBe('0000');
  });

  it('respects threshold', () => {
    const img = makeImage(2, 1, [100, 200]);
    const result = binaryEffect(img, { ...BASE, cols: 2, threshold: 150 });
    const lines = result.text.split('\n');
    expect(lines[0]).toBe('01');
  });
});
