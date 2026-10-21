import type { RGBAImage, PixelArtConfig, PixelArtResult } from '../types.js';
import { hexToRgb, nearestColor } from '../utils/palette.js';

export function pixelArtEffect(img: RGBAImage, config: PixelArtConfig): PixelArtResult {
  const { width, height, data } = img;
  const ps = Math.max(1, config.pixelSize);

  const outW = Math.floor(width / ps);
  const outH = Math.floor(height / ps);
  const out = new Uint8ClampedArray(outW * outH * 4);

  const paletteRgb = config.palette.map(hexToRgb);

  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      let rSum = 0, gSum = 0, bSum = 0;
      let count = 0;

      for (let dy = 0; dy < ps; dy++) {
        for (let dx = 0; dx < ps; dx++) {
          const sx = ox * ps + dx;
          const sy = oy * ps + dy;
          if (sx < width && sy < height) {
            const si = (sy * width + sx) * 4;
            rSum += data[si];
            gSum += data[si + 1];
            bSum += data[si + 2];
            count++;
          }
        }
      }

      let r = Math.round(rSum / count);
      let g = Math.round(gSum / count);
      let b = Math.round(bSum / count);

      if (config.invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      const [nr, ng, nb] = nearestColor(r, g, b, paletteRgb);

      const oi = (oy * outW + ox) * 4;
      out[oi] = nr;
      out[oi + 1] = ng;
      out[oi + 2] = nb;
      out[oi + 3] = 255;
    }
  }

  return { data: out, width: outW, height: outH, pixelSize: ps };
}
