import type { GrayscaleImage } from '../types.js';

/**
 * Single-pass horizontal box blur.
 * Kernel width = 2*radius+1. Edges are clamped (nearest pixel repeated).
 */
function boxBlurH(
  src: Uint8Array,
  dst: Uint8Array,
  width: number,
  height: number,
  radius: number,
): void {
  const diameter = 2 * radius + 1;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    // Seed the running sum with the clamped window for x = 0
    let sum = 0;
    for (let k = -radius; k <= radius; k++) {
      const xi = Math.min(Math.max(k, 0), width - 1);
      sum += src[rowOffset + xi];
    }
    dst[rowOffset] = (sum / diameter + 0.5) | 0;

    for (let x = 1; x < width; x++) {
      // Add the pixel entering the window on the right
      const addIdx = Math.min(x + radius, width - 1);
      // Remove the pixel leaving the window on the left
      const removeIdx = Math.min(Math.max(x - radius - 1, 0), width - 1);
      sum += src[rowOffset + addIdx] - src[rowOffset + removeIdx];
      dst[rowOffset + x] = (sum / diameter + 0.5) | 0;
    }
  }
}

/**
 * Single-pass vertical box blur.
 */
function boxBlurV(
  src: Uint8Array,
  dst: Uint8Array,
  width: number,
  height: number,
  radius: number,
): void {
  const diameter = 2 * radius + 1;
  for (let x = 0; x < width; x++) {
    // Seed the running sum with the clamped window for y = 0
    let sum = 0;
    for (let k = -radius; k <= radius; k++) {
      const yi = Math.min(Math.max(k, 0), height - 1);
      sum += src[yi * width + x];
    }
    dst[x] = (sum / diameter + 0.5) | 0;

    for (let y = 1; y < height; y++) {
      const addIdx = Math.min(y + radius, height - 1);
      const removeIdx = Math.min(Math.max(y - radius - 1, 0), height - 1);
      sum += src[addIdx * width + x] - src[removeIdx * width + x];
      dst[y * width + x] = (sum / diameter + 0.5) | 0;
    }
  }
}

/** Gaussian blur with configurable radius (box blur approximation, 3 passes) */
export function gaussianBlur(image: GrayscaleImage, radius: number): GrayscaleImage {
  const { width, height, data } = image;
  const len = width * height;

  if (radius <= 0) {
    return { width, height, data: new Uint8Array(data) };
  }

  // We alternate between two buffers across 3 horizontal+vertical pass pairs.
  let src = new Uint8Array(data);
  let tmp = new Uint8Array(len);
  let dst = new Uint8Array(len);

  for (let pass = 0; pass < 3; pass++) {
    boxBlurH(src, tmp, width, height, radius);
    boxBlurV(tmp, dst, width, height, radius);
    // Swap: dst becomes src for next pass
    const swap = src;
    src = dst;
    dst = swap;
  }

  // After 3 iterations src holds the final result (last swap put dst→src).
  return { width, height, data: src };
}

/** Unsharp mask sharpening */
export function sharpen(image: GrayscaleImage, amount: number): GrayscaleImage {
  const { width, height, data } = image;

  if (amount <= 0) {
    return { width, height, data: new Uint8Array(data) };
  }

  const blurred = gaussianBlur(image, 1);
  const out = new Uint8Array(width * height);

  for (let i = 0; i < out.length; i++) {
    const val = data[i] + amount * (data[i] - blurred.data[i]);
    out[i] = val < 0 ? 0 : val > 255 ? 255 : (val + 0.5) | 0;
  }

  return { width, height, data: out };
}

/** Reduce to N brightness levels */
export function posterize(image: GrayscaleImage, levels: number): GrayscaleImage {
  const { width, height, data } = image;

  if (levels >= 256) {
    return { width, height, data: new Uint8Array(data) };
  }

  const out = new Uint8Array(width * height);
  const levelsM1 = levels - 1;
  const step = 255 / levelsM1;

  for (let i = 0; i < out.length; i++) {
    out[i] = Math.round(data[i] / 255 * levelsM1) * step;
  }

  return { width, height, data: out };
}
