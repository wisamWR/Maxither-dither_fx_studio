import type { GrayscaleImage, TextResult, GlyphBitmap } from '../types.js';

export type DisplayPolarity = 'light-on-dark' | 'dark-on-light';

/**
 * Rasterize ASCII TextResult back to a GrayscaleImage.
 *
 * Glyph bitmaps are ink-on-white (0=ink, 255=bg).
 * - light-on-dark: invert bitmap so dense chars → bright pixels
 * - dark-on-light: use bitmap as-is (dense chars → dark pixels)
 */
export function rasterizeText(
  result: TextResult,
  glyphs: GlyphBitmap[],
  polarity: DisplayPolarity,
): GrayscaleImage {
  if (glyphs.length === 0) {
    return { width: 0, height: 0, data: new Uint8Array(0) };
  }

  const cellW = glyphs[0].width;
  const cellH = glyphs[0].height;
  const lines = result.text.split('\n');
  const outW = result.cols * cellW;
  const outH = result.rows * cellH;
  const out = new Uint8Array(outW * outH);

  const bgVal = polarity === 'light-on-dark' ? 0 : 255;
  out.fill(bgVal);

  const glyphMap = new Map<string, GlyphBitmap>();
  for (const g of glyphs) glyphMap.set(g.char, g);

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    for (let col = 0; col < line.length; col++) {
      const glyph = glyphMap.get(line[col]);
      if (!glyph) continue;

      for (let gy = 0; gy < cellH; gy++) {
        for (let gx = 0; gx < cellW; gx++) {
          const srcVal = glyph.bitmap[gy * cellW + gx];
          const outX = col * cellW + gx;
          const outY = row * cellH + gy;
          out[outY * outW + outX] = polarity === 'light-on-dark' ? 255 - srcVal : srcVal;
        }
      }
    }
  }

  return { width: outW, height: outH, data: out };
}

/**
 * Rasterize braille TextResult to GrayscaleImage.
 * Decodes Unicode braille (U+2800–U+28FF) back to 2×4 dot grid.
 */
export function rasterizeBraille(
  result: TextResult,
  polarity: DisplayPolarity,
  dotW: number = 2,
  dotH: number = 4,
): GrayscaleImage {
  const charW = 2;
  const charH = 4;
  const lines = result.text.split('\n');
  const outW = result.cols * charW * dotW;
  const outH = result.rows * charH * dotH;
  const out = new Uint8Array(outW * outH);

  const bgVal = polarity === 'light-on-dark' ? 0 : 255;
  const fgVal = polarity === 'light-on-dark' ? 255 : 0;
  out.fill(bgVal);

  // Braille dot positions: bits 0-7 map to specific (col, row) positions
  const dotPositions: [number, number][] = [
    [0, 0], [0, 1], [0, 2], [1, 0],
    [1, 1], [1, 2], [0, 3], [1, 3],
  ];

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    for (let col = 0; col < line.length; col++) {
      const code = line.charCodeAt(col);
      if (code < 0x2800 || code > 0x28FF) continue;
      const dots = code - 0x2800;

      for (let bit = 0; bit < 8; bit++) {
        if (!(dots & (1 << bit))) continue;
        const [dx, dy] = dotPositions[bit];

        const baseX = col * charW * dotW + dx * dotW;
        const baseY = row * charH * dotH + dy * dotH;
        for (let py = 0; py < dotH; py++) {
          for (let px = 0; px < dotW; px++) {
            const ox = baseX + px;
            const oy = baseY + py;
            if (ox < outW && oy < outH) {
              out[oy * outW + ox] = fgVal;
            }
          }
        }
      }
    }
  }

  return { width: outW, height: outH, data: out };
}
