import type { RGBAImage, ColorAsciiConfig, ColorTextResult } from '../types.js';
import { rgbaToGrayscale, applyAdjustments } from '../utils/image-data.js';

function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
  );
}

export function colorAsciiEffect(img: RGBAImage, config: ColorAsciiConfig): ColorTextResult {
  const gray = rgbaToGrayscale(img.data, img.width, img.height);
  const adjusted = applyAdjustments(gray, config);
  const { width, height } = img;
  const grayData = adjusted.data;
  const rgbaData = img.data;

  const charset = config.charset || ' .:-=+*#%@';
  const cols = Math.max(1, Math.min(config.cols, width));
  const blockW = width / cols;
  const blockH = blockW * 2;
  const rows = Math.max(1, Math.floor(height / blockH));

  const lines: string[] = [];
  const colors: string[][] = [];

  for (let row = 0; row < rows; row++) {
    let line = '';
    const rowColors: string[] = [];

    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * blockW);
      const x1 = Math.floor((col + 1) * blockW);
      const y0 = Math.floor(row * blockH);
      const y1 = Math.min(Math.floor((row + 1) * blockH), height);

      let lumSum = 0;
      let rSum = 0, gSum = 0, bSum = 0;
      let count = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          lumSum += grayData[y * width + x];
          const ri = (y * width + x) * 4;
          rSum += rgbaData[ri];
          gSum += rgbaData[ri + 1];
          bSum += rgbaData[ri + 2];
          count++;
        }
      }

      const avgLum = count > 0 ? lumSum / count : 0;
      const charIdx = Math.min(
        Math.floor((avgLum / 255) * charset.length),
        charset.length - 1,
      );
      line += charset[charIdx];

      const avgR = Math.round(count > 0 ? rSum / count : 0);
      const avgG = Math.round(count > 0 ? gSum / count : 0);
      const avgB = Math.round(count > 0 ? bSum / count : 0);
      rowColors.push(toHex(avgR, avgG, avgB));
    }

    lines.push(line);
    colors.push(rowColors);
  }

  return { text: lines.join('\n'), rows: lines.length, cols, colors };
}
