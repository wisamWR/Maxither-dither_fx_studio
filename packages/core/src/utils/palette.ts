import type { ColorPalette } from '../types.js';

export const PALETTES: ColorPalette[] = [
  {
    id: 'mono',
    name: 'Monochrome',
    colors: ['#000000', '#ffffff'],
  },
  {
    id: 'gameboy',
    name: 'Game Boy',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  {
    id: 'cga',
    name: 'CGA',
    colors: [
      '#000000', '#0000aa', '#00aa00', '#00aaaa',
      '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
      '#555555', '#5555ff', '#55ff55', '#55ffff',
      '#ff5555', '#ff55ff', '#ffff55', '#ffffff',
    ],
  },
  {
    id: 'c64',
    name: 'Commodore 64',
    colors: [
      '#000000', '#ffffff', '#880000', '#aaffee',
      '#cc44cc', '#00cc55', '#0000aa', '#eeee77',
      '#dd8855', '#664400', '#ff7777', '#333333',
      '#777777', '#aaff66', '#0088ff', '#bbbbbb',
    ],
  },
  {
    id: 'grayscale4',
    name: 'Grayscale (4)',
    colors: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
  },
  {
    id: 'grayscale8',
    name: 'Grayscale (8)',
    colors: ['#000000', '#242424', '#494949', '#6d6d6d', '#929292', '#b6b6b6', '#dbdbdb', '#ffffff'],
  },
];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function nearestColor(
  r: number,
  g: number,
  b: number,
  paletteRgb: [number, number, number][],
): [number, number, number] {
  let bestDist = Infinity;
  let best = paletteRgb[0];
  for (const c of paletteRgb) {
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}
