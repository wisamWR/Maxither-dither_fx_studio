import { describe, it, expect } from 'vitest';
import { gaussianBlur, sharpen, posterize } from '../src/utils/filters.js';
import type { GrayscaleImage } from '../src/types.js';

/** Create a 10x10 gradient image (0..99 mapped to 0..255 range) */
function makeGradient(): GrayscaleImage {
  const data = new Uint8Array(100);
  for (let i = 0; i < 100; i++) {
    data[i] = Math.round((i / 99) * 255);
  }
  return { width: 10, height: 10, data };
}

/** Create a high-contrast checkerboard */
function makeCheckerboard(): GrayscaleImage {
  const data = new Uint8Array(100);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      data[y * 10 + x] = (x + y) % 2 === 0 ? 0 : 255;
    }
  }
  return { width: 10, height: 10, data };
}

describe('gaussianBlur', () => {
  it('output dimensions match input', () => {
    const img = makeGradient();
    const result = gaussianBlur(img, 2);
    expect(result.width).toBe(10);
    expect(result.height).toBe(10);
    expect(result.data.length).toBe(100);
  });

  it('radius 0 returns same data', () => {
    const img = makeGradient();
    const result = gaussianBlur(img, 0);
    expect(result.data).toEqual(img.data);
    // Must be a copy, not the same reference
    expect(result.data).not.toBe(img.data);
  });

  it('radius > 0 reduces contrast', () => {
    const img = makeCheckerboard();
    const inputMin = Math.min(...img.data);
    const inputMax = Math.max(...img.data);
    const inputRange = inputMax - inputMin;

    const result = gaussianBlur(img, 2);
    const outputMin = Math.min(...result.data);
    const outputMax = Math.max(...result.data);
    const outputRange = outputMax - outputMin;

    expect(outputRange).toBeLessThan(inputRange);
  });
});

describe('sharpen', () => {
  it('amount 0 returns same data', () => {
    const img = makeGradient();
    const result = sharpen(img, 0);
    expect(result.data).toEqual(img.data);
    expect(result.data).not.toBe(img.data);
  });

  it('amount > 0 increases local contrast', () => {
    const img = makeCheckerboard();
    const blurred = gaussianBlur(img, 1);
    const blurredRange =
      Math.max(...blurred.data) - Math.min(...blurred.data);

    const sharpened = sharpen(blurred, 5);
    const sharpenedRange =
      Math.max(...sharpened.data) - Math.min(...sharpened.data);

    expect(sharpenedRange).toBeGreaterThan(blurredRange);
  });
});

describe('posterize', () => {
  it('levels=2 produces only 0 and 255', () => {
    const img = makeGradient();
    const result = posterize(img, 2);
    const unique = new Set(result.data);
    expect(unique.size).toBeLessThanOrEqual(2);
    for (const v of unique) {
      expect([0, 255]).toContain(v);
    }
  });

  it('levels=4 produces at most 4 distinct values', () => {
    const img = makeGradient();
    const result = posterize(img, 4);
    const unique = new Set(result.data);
    expect(unique.size).toBeLessThanOrEqual(4);
  });

  it('output dimensions match input', () => {
    const img = makeGradient();
    const result = posterize(img, 4);
    expect(result.width).toBe(10);
    expect(result.height).toBe(10);
    expect(result.data.length).toBe(100);
  });
});
