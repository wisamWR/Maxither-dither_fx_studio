import type { GrayscaleImage, BayerConfig, DitherResult } from '../types.js';
import { applyAdjustments } from '../utils/image-data.js';

const BAYER_2 = [
  [0, 2],
  [3, 1],
];

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const BAYER_8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function getMatrix(size: 2 | 4 | 8): number[][] {
  switch (size) {
    case 2: return BAYER_2;
    case 4: return BAYER_4;
    case 8: return BAYER_8;
  }
}

export function bayerDither(img: GrayscaleImage, config: BayerConfig): DitherResult {
  const adjusted = applyAdjustments(img, config);
  const { width, height } = adjusted;
  const matrix = getMatrix(config.matrixSize);
  const n = matrix.length;
  const n2 = n * n;

  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const lum = adjusted.data[idx];
      const threshold = ((matrix[y % n][x % n] + 0.5) / n2) * 255;
      out[idx] = lum > threshold ? 255 : 0;
    }
  }

  return { data: out, width, height };
}
