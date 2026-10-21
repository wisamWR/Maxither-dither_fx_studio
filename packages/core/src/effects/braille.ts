import type { GrayscaleImage, BrailleConfig, TextResult } from '../types.js';
import { applyAdjustments } from '../utils/image-data.js';

const BRAILLE_BASE = 0x2800;

const DOT_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

export function brailleEffect(img: GrayscaleImage, config: BrailleConfig): TextResult {
  const adjusted = applyAdjustments(img, config);
  const { width, height, data } = adjusted;

  const cols = Math.max(1, Math.min(config.cols, Math.floor(width / 2)));
  const pixW = cols * 2;
  const scaleX = width / pixW;
  const scaleY = scaleX;
  const pixH = Math.floor(height / scaleY);
  const rows = Math.max(1, Math.floor(pixH / 4));

  const lines: string[] = [];

  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      let codePoint = 0;

      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const srcX = Math.floor((col * 2 + dx) * scaleX);
          const srcY = Math.floor((row * 4 + dy) * scaleY);

          if (srcX < width && srcY < height) {
            const lum = data[srcY * width + srcX];
            if (lum < config.threshold) {
              codePoint |= DOT_BITS[dy][dx];
            }
          }
        }
      }

      line += String.fromCodePoint(BRAILLE_BASE + codePoint);
    }
    lines.push(line);
  }

  return { text: lines.join('\n'), rows: lines.length, cols };
}
