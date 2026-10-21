import type { GrayscaleImage, DitherConfig, DitherResult } from '../types.js';
import { applyAdjustments } from '../utils/image-data.js';

/**
 * Atkinson dithering. Distributes only 6/8 (75%) of error,
 * producing higher contrast than Floyd-Steinberg.
 *
 *       * 1/8 1/8
 *  1/8 1/8 1/8
 *       1/8
 */
export function atkinsonDither(img: GrayscaleImage, config: DitherConfig): DitherResult {
  const adjusted = applyAdjustments(img, config);
  const { width, height } = adjusted;
  const buf = new Float32Array(adjusted.data);
  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = buf[idx];
      const newVal = oldVal >= config.threshold ? 255 : 0;
      out[idx] = newVal;
      const frac = (oldVal - newVal) / 8;

      if (x + 1 < width) buf[idx + 1] += frac;
      if (x + 2 < width) buf[idx + 2] += frac;
      if (y + 1 < height) {
        if (x > 0) buf[(y + 1) * width + (x - 1)] += frac;
        buf[(y + 1) * width + x] += frac;
        if (x + 1 < width) buf[(y + 1) * width + (x + 1)] += frac;
      }
      if (y + 2 < height) {
        buf[(y + 2) * width + x] += frac;
      }
    }
  }

  return { data: out, width, height };
}
