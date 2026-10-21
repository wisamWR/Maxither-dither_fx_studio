import { describe, it, expect } from 'vitest';
import { colorAsciiEffect } from '../src/effects/color-ascii.js';
import type { RGBAImage, ColorAsciiConfig, ColorTextResult } from '../src/types.js';

function makeRGBA(w: number, h: number, r: number, g: number, b: number): RGBAImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data };
}

const BASE_CONFIG: ColorAsciiConfig = {
  cols: 4,
  charset: ' .:-=+*#%@',
  brightness: 0,
  contrast: 0,
  invert: false,
};

describe('colorAsciiEffect', () => {
  it('returns ColorTextResult with text and colors', () => {
    const img = makeRGBA(16, 24, 128, 64, 200);
    const result = colorAsciiEffect(img, BASE_CONFIG);
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('colors');
    expect(result.cols).toBe(4);
    expect(result.rows).toBeGreaterThan(0);
  });

  it('colors array dimensions match text dimensions', () => {
    const img = makeRGBA(16, 24, 100, 150, 200);
    const result = colorAsciiEffect(img, BASE_CONFIG);
    expect(result.colors.length).toBe(result.rows);
    for (const row of result.colors) {
      expect(row.length).toBe(result.cols);
    }
  });

  it('color reflects source image color', () => {
    const img = makeRGBA(16, 24, 255, 0, 0);
    const result = colorAsciiEffect(img, BASE_CONFIG);
    for (const row of result.colors) {
      for (const color of row) {
        expect(color).toBe('#ff0000');
      }
    }
  });

  it('different regions get different colors', () => {
    const w = 16, h = 24;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        data[i] = x < 8 ? 255 : 0;
        data[i + 1] = 0;
        data[i + 2] = x < 8 ? 0 : 255;
        data[i + 3] = 255;
      }
    }
    const img: RGBAImage = { width: w, height: h, data };
    const result = colorAsciiEffect(img, { ...BASE_CONFIG, cols: 4 });
    const firstColor = result.colors[0][0];
    const lastColor = result.colors[0][3];
    expect(firstColor).not.toBe(lastColor);
  });

  it('text uses charset characters based on luminance', () => {
    const img = makeRGBA(16, 24, 255, 255, 255);
    const result = colorAsciiEffect(img, BASE_CONFIG);
    const chars = result.text.replace(/\n/g, '');
    const lastChar = BASE_CONFIG.charset[BASE_CONFIG.charset.length - 1];
    for (const c of chars) {
      expect(c).toBe(lastChar);
    }
  });
});
