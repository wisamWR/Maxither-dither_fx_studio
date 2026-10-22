import type { Panel, BitLayout } from './types.js';

export function byteLength(width: number, height: number, layout: BitLayout): number {
  if (layout === 'page-vertical') {
    return width * Math.ceil(height / 8);
  }
  return Math.ceil(width / 8) * height;
}

export function packBits(
  data: Uint8Array,
  width: number,
  height: number,
  layout: BitLayout,
  panel: Panel,
  invert: boolean,
): Uint8Array {
  const len = byteLength(width, height, layout);
  const out = new Uint8Array(len);

  const toBit = (pixel: number): number => {
    const bit = panel.oneIs === 'bright'
      ? (pixel > 127 ? 1 : 0)
      : (pixel > 127 ? 0 : 1);
    return invert ? 1 - bit : bit;
  };

  if (layout === 'page-vertical') {
    const pages = Math.ceil(height / 8);
    for (let page = 0; page < pages; page++) {
      for (let x = 0; x < width; x++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const y = page * 8 + bit;
          if (y >= height) break;
          const pixel = data[y * width + x];
          if (toBit(pixel)) byte |= (1 << bit);
        }
        out[page * width + x] = byte;
      }
    }
  } else {
    const bytesPerRow = Math.ceil(width / 8);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = data[y * width + x];
        if (!toBit(pixel)) continue;
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitIdx = layout === 'row-msb' ? 7 - (x % 8) : x % 8;
        out[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  return out;
}
