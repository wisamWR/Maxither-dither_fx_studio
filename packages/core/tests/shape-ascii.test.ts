import { describe, it, expect } from 'vitest';
import { shapeAsciiEffect } from '../src/effects/shape-ascii.js';
import type { GrayscaleImage, ShapeAsciiConfig, GlyphBitmap } from '../src/types.js';

const GW = 4;
const GH = 6;

function makeImage(w: number, h: number, fill: number): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(w * h).fill(fill) };
}

function makeGlyph(char: string, fill: number): GlyphBitmap {
  const bitmap = new Uint8Array(GW * GH).fill(fill);
  let inkCount = 0;
  for (let i = 0; i < bitmap.length; i++) if (bitmap[i] < 128) inkCount++;
  return { char, bitmap, width: GW, height: GH, density: inkCount / bitmap.length };
}

const glyphs: GlyphBitmap[] = [
  makeGlyph(' ', 255),
  makeGlyph('#', 0),
  makeGlyph('.', 200),
];

const BASE_CONFIG: ShapeAsciiConfig = {
  cols: 4,
  glyphs,
  brightness: 0,
  contrast: 0,
  invert: false,
};

describe('shapeAsciiEffect', () => {
  it('returns correct dimensions', () => {
    const img = makeImage(16, 24, 128);
    const result = shapeAsciiEffect(img, BASE_CONFIG);
    expect(result.cols).toBe(4);
    expect(result.rows).toBeGreaterThan(0);
    expect(result.text.split('\n').length).toBe(result.rows);
  });

  it('white image → space characters (lowest density)', () => {
    const img = makeImage(16, 24, 255);
    const result = shapeAsciiEffect(img, BASE_CONFIG);
    for (const char of result.text.replace(/\n/g, '')) {
      expect(char).toBe(' ');
    }
  });

  it('black image → # characters (highest density)', () => {
    const img = makeImage(16, 24, 0);
    const result = shapeAsciiEffect(img, BASE_CONFIG);
    for (const char of result.text.replace(/\n/g, '')) {
      expect(char).toBe('#');
    }
  });

  it('respects brightness adjustment', () => {
    const img = makeImage(16, 24, 128);
    const darkResult = shapeAsciiEffect(img, { ...BASE_CONFIG, brightness: -80 });
    const brightResult = shapeAsciiEffect(img, { ...BASE_CONFIG, brightness: 80 });
    const darkHashes = (darkResult.text.match(/#/g) || []).length;
    const brightHashes = (brightResult.text.match(/#/g) || []).length;
    expect(darkHashes).toBeGreaterThan(brightHashes);
  });

  it('returns TextResult shape', () => {
    const img = makeImage(16, 24, 128);
    const result = shapeAsciiEffect(img, BASE_CONFIG);
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('cols');
  });
});
