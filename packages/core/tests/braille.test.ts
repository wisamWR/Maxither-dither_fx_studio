import { describe, it, expect } from 'vitest';
import { brailleEffect } from '../src/effects/braille.js';
import type { GrayscaleImage, BrailleConfig } from '../src/types.js';

function makeImage(w: number, h: number, values: number[]): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(values) };
}

const BASE: BrailleConfig = { cols: 2, threshold: 128, brightness: 0, contrast: 0, invert: false };

describe('brailleEffect', () => {
  it('all-white produces empty braille', () => {
    const data = new Array(16).fill(255);
    const img = makeImage(4, 4, data);
    const result = brailleEffect(img, { ...BASE, cols: 2 });
    const lines = result.text.split('\n');
    expect(lines[0]).toBe('\u2800\u2800');
  });

  it('all-black produces full braille', () => {
    const data = new Array(16).fill(0);
    const img = makeImage(4, 4, data);
    const result = brailleEffect(img, { ...BASE, cols: 2 });
    const lines = result.text.split('\n');
    expect(lines[0]).toBe('\u28FF\u28FF');
  });
});
