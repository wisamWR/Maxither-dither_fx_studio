import { describe, it, expect } from 'vitest';
import { edgeAsciiEffect } from '../src/effects/edge-ascii.js';
import type { GrayscaleImage, EdgeAsciiConfig } from '../src/types.js';

function makeImage(w: number, h: number, values: number[]): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(values) };
}

const BASE_CONFIG: EdgeAsciiConfig = {
  cols: 4,
  edgeThreshold: 30,
  mode: 'edge-only',
  charset: ' .:-=+*#%@',
  brightness: 0,
  contrast: 0,
  invert: false,
};

describe('edgeAsciiEffect', () => {
  it('returns TextResult with correct dimensions', () => {
    const img = makeImage(16, 24, Array(16 * 24).fill(128));
    const result = edgeAsciiEffect(img, BASE_CONFIG);
    expect(result.cols).toBe(4);
    expect(result.rows).toBeGreaterThan(0);
    expect(result.text.split('\n').length).toBe(result.rows);
  });

  it('uniform image → all spaces in edge-only mode', () => {
    const img = makeImage(16, 24, Array(16 * 24).fill(128));
    const result = edgeAsciiEffect(img, BASE_CONFIG);
    for (const char of result.text.replace(/\n/g, '')) {
      expect(char).toBe(' ');
    }
  });

  it('vertical edge produces | characters', () => {
    const values: number[] = [];
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 16; x++) {
        values.push(x < 8 ? 0 : 255);
      }
    }
    const img = makeImage(16, 24, values);
    const result = edgeAsciiEffect(img, { ...BASE_CONFIG, cols: 8 });
    const lines = result.text.split('\n');
    const hasVertical = lines.some((line) => line.includes('|'));
    expect(hasVertical).toBe(true);
  });

  it('horizontal edge produces - characters', () => {
    const values: number[] = [];
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 16; x++) {
        values.push(y < 12 ? 0 : 255);
      }
    }
    const img = makeImage(16, 24, values);
    const result = edgeAsciiEffect(img, { ...BASE_CONFIG, cols: 8 });
    const hasDash = result.text.includes('-');
    expect(hasDash).toBe(true);
  });

  it('hybrid mode fills non-edges with brightness characters', () => {
    const img = makeImage(16, 24, Array(16 * 24).fill(240));
    const result = edgeAsciiEffect(img, { ...BASE_CONFIG, mode: 'hybrid' });
    const nonSpace = result.text.replace(/[\n ]/g, '');
    expect(nonSpace.length).toBeGreaterThan(0);
  });
});
