import type { TextResult, ColorTextResult, AnsiExportOptions } from '../types.js';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

function hexToRgbValues(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToAnsi256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round((r - 8) / 247 * 24) + 232;
  }
  const ri = Math.round(r / 255 * 5);
  const gi = Math.round(g / 255 * 5);
  const bi = Math.round(b / 255 * 5);
  return 16 + 36 * ri + 6 * gi + bi;
}

const ANSI_16: [number, number, number, number][] = [
  [0, 0, 0, 0], [1, 128, 0, 0], [2, 0, 128, 0], [3, 128, 128, 0],
  [4, 0, 0, 128], [5, 128, 0, 128], [6, 0, 128, 128], [7, 192, 192, 192],
  [8, 128, 128, 128], [9, 255, 0, 0], [10, 0, 255, 0], [11, 255, 255, 0],
  [12, 0, 0, 255], [13, 255, 0, 255], [14, 0, 255, 255], [15, 255, 255, 255],
];

function rgbToAnsi16(r: number, g: number, b: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (const [code, cr, cg, cb] of ANSI_16) {
    const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = code;
    }
  }
  return best;
}

function colorEscape(r: number, g: number, b: number, opts: AnsiExportOptions): string {
  const layer = opts.useBackground ? 48 : 38;
  switch (opts.mode) {
    case 'truecolor':
      return `${ESC}${layer};2;${r};${g};${b}m`;
    case '256':
      return `${ESC}${layer};5;${rgbToAnsi256(r, g, b)}m`;
    case '16': {
      const code = rgbToAnsi16(r, g, b);
      const base = opts.useBackground ? 40 : 30;
      if (code < 8) return `${ESC}${base + code}m`;
      return `${ESC}${base + code - 8};1m`;
    }
  }
}

export function textToAnsi(
  result: TextResult,
  fgColor: string,
  opts: AnsiExportOptions,
): string {
  const [r, g, b] = hexToRgbValues(fgColor);
  const esc = colorEscape(r, g, b, opts);
  return esc + result.text + RESET;
}

export function colorTextToAnsi(
  result: ColorTextResult,
  opts: AnsiExportOptions,
): string {
  const lines = result.text.split('\n');
  let output = '';
  let lastEsc = '';

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    const rowColors = result.colors[row] ?? [];

    for (let col = 0; col < line.length; col++) {
      const hex = rowColors[col] ?? '#ffffff';
      const [r, g, b] = hexToRgbValues(hex);
      const esc = colorEscape(r, g, b, opts);

      if (esc !== lastEsc) {
        output += esc;
        lastEsc = esc;
      }
      output += line[col];
    }

    if (row < lines.length - 1) output += '\n';
  }

  output += RESET;
  return output;
}
