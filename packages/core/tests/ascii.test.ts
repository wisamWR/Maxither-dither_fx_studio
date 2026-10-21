import { describe, it, expect } from 'vitest';
import { asciiEffect, DEFAULT_ASCII_CHARSET } from '../src/effects/ascii.js';
import type { GrayscaleImage, AsciiConfig } from '../src/types.js';

function makeImage(w: number, h: number, values: number[]): GrayscaleImage {
  return { width: w, height: h, data: new Uint8Array(values) };
}

const BASE: AsciiConfig = { cols: 4, charset: DEFAULT_ASCII_CHARSET, brightness: 0, contrast: 0, invert: false };

describe('asciiEffect', () => {
  it('maps black to first char and white to last char', () => {
    const img = makeImage(2, 1, [0, 255]);
    const result = asciiEffect(img, { ...BASE, cols: 2 });
    const chars = result.text.split('\n')[0];
    expect(chars[0]).toBe(DEFAULT_ASCII_CHARSET[0]);
    expect(chars[1]).toBe(DEFAULT_ASCII_CHARSET[DEFAULT_ASCII_CHARSET.length - 1]);
  });

  it('uses custom charset', () => {
    const img = makeImage(1, 1, [0]);
    const result = asciiEffect(img, { ...BASE, cols: 1, charset: 'AB' });
    expect(result.text.trim()).toBe('A');
  });
});
