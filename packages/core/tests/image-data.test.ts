import { describe, it, expect } from 'vitest';
import {
  rgbaToGrayscale,
  adjustBrightness,
  adjustContrast,
  invertImage,
  applyAdjustments,
} from '../src/utils/image-data.js';
import type { GrayscaleImage } from '../src/types.js';

describe('rgbaToGrayscale', () => {
  it('converts RGBA to luminance', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    const result = rgbaToGrayscale(rgba, 2, 1);
    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(0);
  });

  it('uses luminance formula', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255]);
    const result = rgbaToGrayscale(rgba, 1, 1);
    expect(result.data[0]).toBe(76);
  });
});

describe('adjustBrightness', () => {
  it('increases brightness', () => {
    const img: GrayscaleImage = { width: 1, height: 1, data: new Uint8Array([100]) };
    const result = adjustBrightness(img, 50);
    expect(result.data[0]).toBe(228);
  });

  it('decreases brightness', () => {
    const img: GrayscaleImage = { width: 1, height: 1, data: new Uint8Array([100]) };
    const result = adjustBrightness(img, -50);
    expect(result.data[0]).toBe(0);
  });

  it('returns new array', () => {
    const img: GrayscaleImage = { width: 1, height: 1, data: new Uint8Array([100]) };
    const result = adjustBrightness(img, 10);
    expect(result.data).not.toBe(img.data);
  });
});

describe('adjustContrast', () => {
  it('increases contrast', () => {
    const img: GrayscaleImage = { width: 2, height: 1, data: new Uint8Array([100, 200]) };
    const result = adjustContrast(img, 50);
    expect(result.data[0]).toBeLessThan(100);
    expect(result.data[1]).toBe(255);
  });
});

describe('invertImage', () => {
  it('inverts all pixels', () => {
    const img: GrayscaleImage = { width: 2, height: 1, data: new Uint8Array([0, 255]) };
    const result = invertImage(img);
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(0);
  });
});

describe('applyAdjustments', () => {
  it('applies invert', () => {
    const img: GrayscaleImage = { width: 1, height: 1, data: new Uint8Array([128]) };
    const result = applyAdjustments(img, { brightness: 0, contrast: 0, invert: true });
    expect(result.data[0]).toBe(127);
  });

  it('skips when neutral', () => {
    const img: GrayscaleImage = { width: 1, height: 1, data: new Uint8Array([128]) };
    const result = applyAdjustments(img, { brightness: 0, contrast: 0, invert: false });
    expect(result.data[0]).toBe(128);
  });
});
