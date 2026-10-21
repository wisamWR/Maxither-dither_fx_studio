import type { GrayscaleImage, BaseConfig } from '../types.js';

export function rgbaToGrayscale(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): GrayscaleImage {
  const len = width * height;
  const data = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const offset = i * 4;
    data[i] = Math.round(
      0.299 * rgba[offset] + 0.587 * rgba[offset + 1] + 0.114 * rgba[offset + 2],
    );
  }
  return { width, height, data };
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

export function adjustBrightness(img: GrayscaleImage, amount: number): GrayscaleImage {
  if (amount === 0) return { ...img, data: new Uint8Array(img.data) };
  const shift = (amount / 100) * 255;
  const out = new Uint8Array(img.data.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = clamp(img.data[i] + shift);
  }
  return { width: img.width, height: img.height, data: out };
}

export function adjustContrast(img: GrayscaleImage, amount: number): GrayscaleImage {
  if (amount === 0) return { ...img, data: new Uint8Array(img.data) };
  const c = (amount / 100) * 255;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const out = new Uint8Array(img.data.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = clamp(factor * (img.data[i] - 128) + 128);
  }
  return { width: img.width, height: img.height, data: out };
}

export function invertImage(img: GrayscaleImage): GrayscaleImage {
  const out = new Uint8Array(img.data.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = 255 - img.data[i];
  }
  return { width: img.width, height: img.height, data: out };
}

export function applyAdjustments(
  img: GrayscaleImage,
  config: Pick<BaseConfig, 'brightness' | 'contrast' | 'invert'>,
): GrayscaleImage {
  let result = img;
  if (config.brightness !== 0) result = adjustBrightness(result, config.brightness);
  if (config.contrast !== 0) result = adjustContrast(result, config.contrast);
  if (config.invert) result = invertImage(result);
  return result;
}
