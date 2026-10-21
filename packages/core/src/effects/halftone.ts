import type { GrayscaleImage, HalftoneConfig, HalftoneResult, HalftoneDot } from '../types.js';
import { applyAdjustments } from '../utils/image-data.js';

export function halftoneEffect(img: GrayscaleImage, config: HalftoneConfig): HalftoneResult {
  const adjusted = applyAdjustments(img, config);
  const { width, height, data } = adjusted;

  const spacing = Math.max(2, config.dotSpacing);
  const maxR = config.maxDotRadius;
  const angleRad = (config.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const dots: HalftoneDot[] = [];
  const cols = Math.floor(width / spacing);
  const rows = Math.floor(height / spacing);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const cx = (gx + 0.5) * spacing;
      const cy = (gy + 0.5) * spacing;

      // Rotate around image center
      const dx = cx - width / 2;
      const dy = cy - height / 2;
      const rx = dx * cosA - dy * sinA + width / 2;
      const ry = dx * sinA + dy * cosA + height / 2;

      const sx = Math.round(rx);
      const sy = Math.round(ry);
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;

      // Average a small area
      let sum = 0;
      let count = 0;
      const halfSpacing = Math.floor(spacing / 2);
      for (let dy2 = -halfSpacing; dy2 <= halfSpacing; dy2++) {
        for (let dx2 = -halfSpacing; dx2 <= halfSpacing; dx2++) {
          const px = sx + dx2;
          const py = sy + dy2;
          if (px >= 0 && px < width && py >= 0 && py < height) {
            sum += data[py * width + px];
            count++;
          }
        }
      }
      const avgLum = count > 0 ? sum / count : 0;
      const darkness = 1 - avgLum / 255;
      const radius = darkness * maxR;

      dots.push({ x: cx, y: cy, radius });
    }
  }

  return { dots, width, height };
}
