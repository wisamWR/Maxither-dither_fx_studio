import type { GrayscaleImage, EdgeAsciiConfig, TextResult } from '../types.js';
import { applyAdjustments } from '../utils/image-data.js';
import { sobelGradient, directionToChar } from '../utils/edge-detect.js';

export function edgeAsciiEffect(img: GrayscaleImage, config: EdgeAsciiConfig): TextResult {
  const adjusted = applyAdjustments(img, config);
  const { width, height, data } = adjusted;

  const gradient = sobelGradient(adjusted);

  const cols = Math.max(1, Math.min(config.cols, width));
  const blockW = width / cols;
  const blockH = blockW * 2;
  const rows = Math.max(1, Math.floor(height / blockH));

  const charset = config.charset || ' .:-=+*#%@';
  const threshold = config.edgeThreshold;

  const lines: string[] = [];

  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * blockW);
      const x1 = Math.floor((col + 1) * blockW);
      const y0 = Math.floor(row * blockH);
      const y1 = Math.min(Math.floor((row + 1) * blockH), height);

      let maxMag = 0;
      let maxDir = 0;
      let lumSum = 0;
      let count = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = y * width + x;
          const mag = gradient.magnitudes[idx];
          if (mag > maxMag) {
            maxMag = mag;
            maxDir = gradient.directions[idx];
          }
          lumSum += data[idx];
          count++;
        }
      }

      const normMag = gradient.maxMagnitude > 0 ? (maxMag / gradient.maxMagnitude) * 255 : 0;

      if (normMag >= threshold) {
        line += directionToChar(maxDir);
      } else if (config.mode === 'hybrid') {
        const avg = count > 0 ? lumSum / count : 0;
        const idx = Math.min(
          Math.floor((avg / 255) * charset.length),
          charset.length - 1,
        );
        line += charset[idx];
      } else {
        line += ' ';
      }
    }
    lines.push(line);
  }

  return { text: lines.join('\n'), rows: lines.length, cols };
}
