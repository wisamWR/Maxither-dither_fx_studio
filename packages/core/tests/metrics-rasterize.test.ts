// packages/core/tests/metrics-rasterize.test.ts
import { describe, it, expect } from 'vitest';
import { rasterizeText, rasterizeBraille } from '../src/metrics/rasterize.js';
import type { TextResult, GlyphBitmap } from '../src/types.js';

// Create a simple 4×6 glyph: '@' is dense (mostly dark=0), ' ' is sparse (all white=255)
function makeGlyph(char: string, density: number): GlyphBitmap {
  const w = 4, h = 6;
  const data = new Uint8Array(w * h);
  const darkCount = Math.round(density * w * h);
  for (let i = 0; i < w * h; i++) {
    data[i] = i < darkCount ? 0 : 255; // 0 = ink, 255 = background
  }
  return { char, bitmap: data, width: w, height: h, density };
}

const glyphs: GlyphBitmap[] = [
  makeGlyph(' ', 0),
  makeGlyph('.', 0.2),
  makeGlyph('#', 0.7),
  makeGlyph('@', 0.9),
];

describe('rasterizeText', () => {
  it('single char produces glyph-sized output', () => {
    const result: TextResult = { text: '@', rows: 1, cols: 1 };
    const img = rasterizeText(result, glyphs, 'light-on-dark');
    expect(img.width).toBe(4);
    expect(img.height).toBe(6);
  });

  it('multi-row text produces correct dimensions', () => {
    const result: TextResult = { text: '@#\n. ', rows: 2, cols: 2 };
    const img = rasterizeText(result, glyphs, 'light-on-dark');
    expect(img.width).toBe(8);  // 2 cols * 4px
    expect(img.height).toBe(12); // 2 rows * 6px
  });

  it('unknown char renders as background', () => {
    const result: TextResult = { text: '?', rows: 1, cols: 1 };
    const img = rasterizeText(result, glyphs, 'light-on-dark');
    // light-on-dark unknown → dark background (0)
    expect(img.data.every(v => v === 0)).toBe(true);
  });

  it('light-on-dark: dense char produces bright pixels', () => {
    const result: TextResult = { text: '@', rows: 1, cols: 1 };
    const img = rasterizeText(result, glyphs, 'light-on-dark');
    // '@' has density 0.9, glyph bitmap has 0s (ink) → inverted to 255 (bright)
    const mean = img.data.reduce((s, v) => s + v, 0) / img.data.length;
    expect(mean).toBeGreaterThan(128); // mostly bright
  });

  it('dark-on-light: dense char produces dark pixels', () => {
    const result: TextResult = { text: '@', rows: 1, cols: 1 };
    const img = rasterizeText(result, glyphs, 'dark-on-light');
    // '@' bitmap used as-is: 0s (ink/dark)
    const mean = img.data.reduce((s, v) => s + v, 0) / img.data.length;
    expect(mean).toBeLessThan(128); // mostly dark
  });

  it('polarities produce inverted outputs', () => {
    const result: TextResult = { text: '#', rows: 1, cols: 1 };
    const lightOnDark = rasterizeText(result, glyphs, 'light-on-dark');
    const darkOnLight = rasterizeText(result, glyphs, 'dark-on-light');
    // Every pixel should be inverted
    for (let i = 0; i < lightOnDark.data.length; i++) {
      expect(lightOnDark.data[i] + darkOnLight.data[i]).toBe(255);
    }
  });
});

describe('rasterizeBraille', () => {
  it('braille char with dots 1,2,5 (U+2813) renders correct pattern', () => {
    // U+2813 = dots 1,2,5 → positions (0,0), (0,1), (1,2)
    const result: TextResult = { text: '\u2813', rows: 1, cols: 1 };
    const img = rasterizeBraille(result, 'light-on-dark', 2, 4);
    expect(img.width).toBe(4);   // 1 col * 2 dots * 2px
    expect(img.height).toBe(16); // 1 row * 4 dots * 4px
  });

  it('empty braille (U+2800) → all background', () => {
    const result: TextResult = { text: '\u2800', rows: 1, cols: 1 };
    const img = rasterizeBraille(result, 'light-on-dark');
    // No dots → all dark in light-on-dark
    expect(img.data.every(v => v === 0)).toBe(true);
  });
});
