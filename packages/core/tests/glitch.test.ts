import { describe, it, expect } from 'vitest';
import { glitchEffect } from '../src/effects/glitch.js';
import type { RGBAImage, GlitchConfig } from '../src/types.js';

function makeRGBA(w: number, h: number, fill: [number, number, number, number]): RGBAImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return { width: w, height: h, data };
}

function makeGradientRGBA(w: number, h: number): RGBAImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = Math.round((x / w) * 255);           // R gradient left-right
      data[i + 1] = Math.round((y / h) * 255);        // G gradient top-bottom
      data[i + 2] = Math.round(((w - 1 - x) / w) * 255); // B gradient right-left
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

const BASE: GlitchConfig = {
  brightness: 0,
  contrast: 0,
  invert: false,
  intensity: 50,
  seed: 42,
  scanlineCount: 4,
  rgbSplit: false,
  rgbSplitDistance: 5,
};

describe('glitchEffect', () => {
  it('output dimensions match input', () => {
    const img = makeRGBA(20, 20, [128, 128, 128, 255]);
    const result = glitchEffect(img, BASE);
    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
  });

  it('output has glitch discriminant set to true', () => {
    const img = makeRGBA(20, 20, [128, 128, 128, 255]);
    const result = glitchEffect(img, BASE);
    expect(result.glitch).toBe(true);
  });

  it('intensity 0 returns data close to original', () => {
    const img = makeGradientRGBA(20, 20);
    const result = glitchEffect(img, { ...BASE, intensity: 0 });

    // Every pixel should be identical when intensity is 0
    for (let i = 0; i < img.data.length; i++) {
      expect(result.data[i]).toBe(img.data[i]);
    }
  });

  it('different seeds produce different outputs', () => {
    const img = makeGradientRGBA(20, 20);
    const config = { ...BASE, intensity: 80 };

    const resultA = glitchEffect(img, { ...config, seed: 1 });
    const resultB = glitchEffect(img, { ...config, seed: 9999 });

    // At least some pixels should differ
    let diffCount = 0;
    for (let i = 0; i < resultA.data.length; i++) {
      if (resultA.data[i] !== resultB.data[i]) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it('same seed produces identical output (deterministic)', () => {
    const img = makeGradientRGBA(20, 20);
    const config = { ...BASE, intensity: 60, seed: 42 };

    const resultA = glitchEffect(img, config);
    const resultB = glitchEffect(img, config);

    for (let i = 0; i < resultA.data.length; i++) {
      expect(resultA.data[i]).toBe(resultB.data[i]);
    }
  });

  it('RGB split creates visible channel offset at edges', () => {
    const img = makeGradientRGBA(20, 20);
    const config: GlitchConfig = {
      ...BASE,
      intensity: 100,
      rgbSplit: true,
      rgbSplitDistance: 5,
      scanlineCount: 1,
      seed: 0,
    };

    const noSplit = glitchEffect(img, { ...config, rgbSplit: false });
    const withSplit = glitchEffect(img, config);

    // With RGB split, at least some pixels should have different R or B
    let rDiffCount = 0;
    let bDiffCount = 0;
    for (let i = 0; i < noSplit.data.length; i += 4) {
      if (noSplit.data[i] !== withSplit.data[i]) rDiffCount++;
      if (noSplit.data[i + 2] !== withSplit.data[i + 2]) bDiffCount++;
    }
    expect(rDiffCount).toBeGreaterThan(0);
    expect(bDiffCount).toBeGreaterThan(0);
  });

  it('data length equals width * height * 4', () => {
    const img = makeRGBA(20, 20, [100, 150, 200, 255]);
    const result = glitchEffect(img, BASE);
    expect(result.data.length).toBe(result.width * result.height * 4);
  });

  it('brightness adjustment shifts pixel values', () => {
    const img = makeRGBA(10, 10, [128, 128, 128, 255]);
    const bright = glitchEffect(img, { ...BASE, intensity: 0, brightness: 50 });
    // With brightness 50, pixels should be brighter than 128
    expect(bright.data[0]).toBeGreaterThan(128);
    expect(bright.data[1]).toBeGreaterThan(128);
    expect(bright.data[2]).toBeGreaterThan(128);
  });
});
