import type { GrayscaleImage, ShapeAsciiConfig, TextResult } from '../types.js';
import { applyAdjustments } from '../utils/image-data.js';
import { precomputeGlyphStats, nccMatch } from '../utils/glyph-metrics.js';

export function shapeAsciiEffect(img: GrayscaleImage, config: ShapeAsciiConfig): TextResult {
  const adjusted = applyAdjustments(img, config);
  const { width, height, data } = adjusted;
  const { glyphs } = config;

  if (glyphs.length === 0) {
    return { text: '', rows: 0, cols: 0 };
  }

  const glyphW = glyphs[0].width;
  const glyphH = glyphs[0].height;

  const cols = Math.max(1, Math.min(config.cols, width));
  const blockW = width / cols;
  const blockH = blockW * (glyphH / glyphW);
  const rows = Math.max(1, Math.floor(height / blockH));

  const stats = precomputeGlyphStats(glyphs);

  const cellSize = glyphW * glyphH;
  const cellBuf = new Float32Array(cellSize);

  const lines: string[] = [];

  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      const x0 = col * blockW;
      const y0 = row * blockH;

      for (let gy = 0; gy < glyphH; gy++) {
        for (let gx = 0; gx < glyphW; gx++) {
          const sx = Math.min(Math.floor(x0 + (gx / glyphW) * blockW), width - 1);
          const sy = Math.min(Math.floor(y0 + (gy / glyphH) * blockH), height - 1);
          cellBuf[gy * glyphW + gx] = data[sy * width + sx];
        }
      }

      const bestIdx = nccMatch(cellBuf, glyphs, stats);
      line += glyphs[bestIdx].char;
    }
    lines.push(line);
  }

  return { text: lines.join('\n'), rows: lines.length, cols };
}
