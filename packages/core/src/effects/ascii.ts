import type { GrayscaleImage, AsciiConfig, TextResult } from '../types.js';
import { applyAdjustments } from '../utils/image-data.js';

export const DEFAULT_ASCII_CHARSET = ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@';

export function asciiEffect(img: GrayscaleImage, config: AsciiConfig): TextResult {
  const adjusted = applyAdjustments(img, config);
  const { width, height, data } = adjusted;
  const charset = config.charset || DEFAULT_ASCII_CHARSET;

  const cols = Math.max(1, Math.min(config.cols, width));
  const blockW = width / cols;
  const blockH = blockW * 2;
  const rows = Math.max(1, Math.floor(height / blockH));

  const lines: string[] = [];

  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * blockW);
      const x1 = Math.floor((col + 1) * blockW);
      const y0 = Math.floor(row * blockH);
      const y1 = Math.min(Math.floor((row + 1) * blockH), height);

      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += data[y * width + x];
          count++;
        }
      }
      const avg = count > 0 ? sum / count : 0;
      const idx = Math.min(
        Math.floor((avg / 255) * charset.length),
        charset.length - 1,
      );
      line += charset[idx];
    }
    lines.push(line);
  }

  return { text: lines.join('\n'), rows: lines.length, cols };
}
