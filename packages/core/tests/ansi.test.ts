import { describe, it, expect } from 'vitest';
import { textToAnsi, colorTextToAnsi } from '../src/export/ansi.js';
import type { TextResult, ColorTextResult, AnsiExportOptions } from '../src/types.js';

const ESC = '\x1b[';
const RESET = '\x1b[0m';

describe('textToAnsi', () => {
  const text: TextResult = { text: 'AB\nCD', rows: 2, cols: 2 };
  const fgColor = '#00ff00';

  it('truecolor: wraps text with RGB foreground escape', () => {
    const result = textToAnsi(text, fgColor, { mode: 'truecolor', useBackground: false });
    expect(result).toContain(`${ESC}38;2;0;255;0m`);
    expect(result).toContain('AB');
    expect(result).toContain(RESET);
  });

  it('256-color: uses closest 256-color code', () => {
    const result = textToAnsi(text, fgColor, { mode: '256', useBackground: false });
    expect(result).toContain(`${ESC}38;5;`);
  });

  it('16-color: uses basic ANSI code', () => {
    const result = textToAnsi(text, '#ff0000', { mode: '16', useBackground: false });
    expect(result).toContain(ESC);
    expect(result).toContain(RESET);
  });

  it('preserves newlines', () => {
    const result = textToAnsi(text, fgColor, { mode: 'truecolor', useBackground: false });
    expect(result).toContain('\n');
  });
});

describe('colorTextToAnsi', () => {
  const colorText: ColorTextResult = {
    text: 'AB\nCD',
    rows: 2,
    cols: 2,
    colors: [['#ff0000', '#00ff00'], ['#0000ff', '#ffff00']],
  };

  it('truecolor: each character gets its own color', () => {
    const result = colorTextToAnsi(colorText, { mode: 'truecolor', useBackground: false });
    expect(result).toContain(`${ESC}38;2;255;0;0m`);
    expect(result).toContain(`${ESC}38;2;0;255;0m`);
    expect(result).toContain(`${ESC}38;2;0;0;255m`);
    expect(result).toContain('A');
    expect(result).toContain('B');
  });

  it('collapses consecutive same-color chars into one escape', () => {
    const sameColor: ColorTextResult = {
      text: 'AAAA', rows: 1, cols: 4,
      colors: [['#ff0000', '#ff0000', '#ff0000', '#ff0000']],
    };
    const result = colorTextToAnsi(sameColor, { mode: 'truecolor', useBackground: false });
    const matches = result.match(/38;2;255;0;0m/g);
    expect(matches?.length).toBe(1);
  });

  it('ends with reset', () => {
    const result = colorTextToAnsi(colorText, { mode: 'truecolor', useBackground: false });
    expect(result.trimEnd().endsWith(RESET)).toBe(true);
  });
});
