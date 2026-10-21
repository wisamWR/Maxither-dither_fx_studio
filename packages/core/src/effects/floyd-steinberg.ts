import type { GrayscaleImage, DitherConfig, DitherResult } from '../types.js';
import { applyAdjustments } from '../utils/image-data.js';

/**
 * Floyd-Steinberg error diffusion dithering.
 *
 *         * 7/16
 *   3/16 5/16 1/16
 */
export function floydSteinberg(img: GrayscaleImage, config: DitherConfig): DitherResult {
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
      const err = oldVal - newVal;

      if (x + 1 < width) buf[idx + 1] += err * (7 / 16);
      if (y + 1 < height) {
        if (x > 0) buf[(y + 1) * width + (x - 1)] += err * (3 / 16);
        buf[(y + 1) * width + x] += err * (5 / 16);
        if (x + 1 < width) buf[(y + 1) * width + (x + 1)] += err * (1 / 16);
      }
    }
  }

  return { data: out, width, height };
}
