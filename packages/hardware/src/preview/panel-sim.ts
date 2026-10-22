import type { Panel } from '../types.js';

export function simulatePanel(
  data: Uint8Array,
  width: number,
  height: number,
  panel: Panel,
  invert: boolean,
): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      const pixel = data[y * width + x];
      let on = panel.oneIs === 'bright' ? pixel > 127 : pixel <= 127;
      if (invert) on = !on;
      row.push(on);
    }
    grid.push(row);
  }
  return grid;
}
