import { describe, it, expect } from 'vitest';
import { pixelArtEffect } from '../src/effects/pixel-art.js';
import type { RGBAImage, PixelArtConfig } from '../src/types.js';

function makeRGBA(w: number, h: number, rgba: number[]): RGBAImage {
  return { width: w, height: h, data: new Uint8ClampedArray(rgba) };
}

const BASE: PixelArtConfig = { pixelSize: 2, palette: ['#000000', '#ffffff'], brightness: 0, contrast: 0, invert: false };

describe('pixelArtEffect', () => {
  it('downscales by pixelSize', () => {
    const rgba = new Array(64).fill(255);
    const img = makeRGBA(4, 4, rgba);
    const result = pixelArtEffect(img, BASE);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.pixelSize).toBe(2);
  });

  it('maps colors to nearest in palette', () => {
    const img = makeRGBA(2, 2, [
      255, 0, 0, 255, 255, 0, 0, 255,
      255, 0, 0, 255, 255, 0, 0, 255,
    ]);
    const result = pixelArtEffect(img, { ...BASE, pixelSize: 2 });
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
    expect(result.data[3]).toBe(255);
  });

  it('uses Game Boy palette', () => {
    const img = makeRGBA(2, 2, [
      255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    const result = pixelArtEffect(img, {
      ...BASE,
      pixelSize: 2,
      palette: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    });
    expect(result.data[0]).toBe(0x9b);
    expect(result.data[1]).toBe(0xbc);
    expect(result.data[2]).toBe(0x0f);
  });
});
