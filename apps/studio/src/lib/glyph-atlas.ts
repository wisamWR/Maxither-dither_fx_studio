import type { GlyphBitmap } from '@ditherforge/core';

const PRINTABLE_START = 32;
const PRINTABLE_END = 126;

/**
 * Render every printable ASCII character to a small grayscale bitmap
 * using Canvas API.
 */
export function generateGlyphBitmaps(
  fontFamily = 'monospace',
  glyphW = 6,
  glyphH = 12,
): GlyphBitmap[] {
  const canvas = document.createElement('canvas');
  canvas.width = glyphW;
  canvas.height = glyphH;
  const ctx = canvas.getContext('2d')!;

  const fontSize = glyphH * 0.85;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  const glyphs: GlyphBitmap[] = [];

  for (let code = PRINTABLE_START; code <= PRINTABLE_END; code++) {
    const char = String.fromCharCode(code);

    // Clear to white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, glyphW, glyphH);

    // Draw character in black
    ctx.fillStyle = '#000000';
    ctx.fillText(char, 0, 0);

    // Read pixels
    const imageData = ctx.getImageData(0, 0, glyphW, glyphH);
    const bitmap = new Uint8Array(glyphW * glyphH);
    let inkCount = 0;

    for (let i = 0; i < bitmap.length; i++) {
      bitmap[i] = imageData.data[i * 4];
      if (bitmap[i] < 128) inkCount++;
    }

    const density = inkCount / bitmap.length;
    glyphs.push({ char, bitmap, width: glyphW, height: glyphH, density });
  }

  return glyphs;
}
