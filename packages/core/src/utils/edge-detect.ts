import type { GrayscaleImage, GradientMap } from '../types.js';

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

export function sobelGradient(img: GrayscaleImage): GradientMap {
  const { width, height, data } = img;
  const magnitudes = new Float32Array(width * height);
  const directions = new Float32Array(width * height);
  let maxMag = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = data[(y + ky) * width + (x + kx)];
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += pixel * SOBEL_X[ki];
          gy += pixel * SOBEL_Y[ki];
        }
      }

      const mag = Math.sqrt(gx * gx + gy * gy);
      const idx = y * width + x;
      magnitudes[idx] = mag;
      directions[idx] = Math.atan2(gy, gx);

      if (mag > maxMag) maxMag = mag;
    }
  }

  return { magnitudes, directions, width, height, maxMagnitude: maxMag };
}

export function directionToChar(direction: number): string {
  let angle = ((direction % Math.PI) + Math.PI) % Math.PI;

  if (angle < Math.PI / 8 || angle >= (7 * Math.PI) / 8) return '|';
  if (angle < (3 * Math.PI) / 8) return '\\';
  if (angle < (5 * Math.PI) / 8) return '-';
  return '/';
}
