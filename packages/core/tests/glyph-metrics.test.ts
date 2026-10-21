import { describe, it, expect } from 'vitest';
import { sortGlyphsByDensity, buildCalibratedCharset, nccMatch } from '../src/utils/glyph-metrics.js';
import type { GlyphBitmap } from '../src/types.js';

function makeGlyph(char: string, density: number, w = 4, h = 6): GlyphBitmap {
  const fill = Math.round((1 - density) * 255);
  return {
    char,
    bitmap: new Uint8Array(w * h).fill(fill),
    width: w,
    height: h,
    density,
  };
}

describe('sortGlyphsByDensity', () => {
  it('sorts glyphs from lowest to highest density', () => {
    const glyphs = [
      makeGlyph('@', 0.9),
      makeGlyph(' ', 0.0),
      makeGlyph('.', 0.1),
      makeGlyph('#', 0.7),
    ];
    const sorted = sortGlyphsByDensity(glyphs);
    expect(sorted.map((g) => g.char)).toEqual([' ', '.', '#', '@']);
  });
});

describe('buildCalibratedCharset', () => {
  it('returns charset string sorted by density', () => {
    const glyphs = [
      makeGlyph('@', 0.9),
      makeGlyph(' ', 0.0),
      makeGlyph('.', 0.1),
    ];
    expect(buildCalibratedCharset(glyphs)).toBe(' .@');
  });
});

describe('nccMatch', () => {
  it('returns best matching glyph index for identical pattern', () => {
    const w = 4, h = 6;
    const topBlack = new Uint8Array(w * h);
    for (let i = 0; i < (w * h) / 2; i++) topBlack[i] = 0;
    for (let i = (w * h) / 2; i < w * h; i++) topBlack[i] = 255;

    const glyphs: GlyphBitmap[] = [
      { char: 'A', bitmap: new Uint8Array(w * h).fill(128), width: w, height: h, density: 0.5 },
      { char: 'B', bitmap: topBlack, width: w, height: h, density: 0.5 },
      { char: 'C', bitmap: new Uint8Array(w * h).fill(0), width: w, height: h, density: 1.0 },
    ];

    const cell = new Float32Array(topBlack);
    const idx = nccMatch(cell, glyphs);
    expect(idx).toBe(1);
  });

  it('falls back to density matching for flat cells', () => {
    const w = 4, h = 6;
    const glyphs: GlyphBitmap[] = [
      makeGlyph(' ', 0.0, w, h),
      makeGlyph('#', 0.8, w, h),
    ];
    const cell = new Float32Array(w * h).fill(50);
    const idx = nccMatch(cell, glyphs);
    expect(idx).toBe(1);
  });
});
