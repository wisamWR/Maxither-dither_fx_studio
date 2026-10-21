import { describe, it, expect } from 'vitest';
import { textToSvg, halftonesToSvg, pixelArtToSvg } from '../src/svg/builder.js';
import type { TextResult, HalftoneResult, PixelArtResult } from '../src/types.js';

describe('textToSvg', () => {
  it('wraps text in SVG', () => {
    const result: TextResult = { text: 'AB\nCD', rows: 2, cols: 2 };
    const svg = textToSvg(result, { fontSize: 14, color: '#00ff00', bgColor: undefined });
    expect(svg).toContain('<svg');
    expect(svg).toContain('AB');
    expect(svg).toContain('#00ff00');
  });

  it('includes background rect', () => {
    const result: TextResult = { text: 'X', rows: 1, cols: 1 };
    const svg = textToSvg(result, { fontSize: 14, color: '#fff', bgColor: '#000' });
    expect(svg).toContain('<rect');
    expect(svg).toContain('#000');
  });
});

describe('halftonesToSvg', () => {
  it('generates circle elements', () => {
    const result: HalftoneResult = {
      dots: [{ x: 10, y: 10, radius: 5 }],
      width: 20,
      height: 20,
    };
    const svg = halftonesToSvg(result, { color: '#000', bgColor: '#fff' });
    expect(svg).toContain('<circle');
    expect(svg).toContain('r="5.0"');
  });

  it('skips zero-radius dots', () => {
    const result: HalftoneResult = {
      dots: [{ x: 10, y: 10, radius: 0 }, { x: 20, y: 20, radius: 3 }],
      width: 30,
      height: 30,
    };
    const svg = halftonesToSvg(result, { color: '#000', bgColor: '#fff' });
    expect(svg).not.toContain('r="0');
    expect(svg).toContain('r="3.0"');
  });
});

describe('pixelArtToSvg', () => {
  it('generates rect elements', () => {
    const result: PixelArtResult = {
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
      width: 2,
      height: 1,
      pixelSize: 4,
    };
    const svg = pixelArtToSvg(result);
    expect(svg).toContain('<rect');
    expect(svg).toContain('width="8"');
  });
});
