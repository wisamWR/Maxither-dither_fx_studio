import { describe, it, expect } from 'vitest';
import { packBits } from '../src/pack.js';
import type { Panel } from '../src/types.js';

const strip = new Uint8Array([0, 255, 0, 255, 0, 255, 0, 255]);

const brightPanel: Panel = {
  id: 'oled', name: 'OLED', width: 8, height: 1,
  pixelShape: 'round', tint: '#00f', category: 'oled',
  oneIs: 'bright', notes: '',
};

const darkPanel: Panel = {
  id: 'thermal', name: 'Thermal', width: 8, height: 1,
  pixelShape: 'square', tint: '#444', category: 'thermal',
  oneIs: 'dark', notes: '',
};

describe('polarity', () => {
  it('bright panel: white pixel (255) → bit 1', () => {
    const packed = packBits(strip, 8, 1, 'row-msb', brightPanel, false);
    expect(packed[0]).toBe(0x55);
  });

  it('dark panel: black pixel (0) → bit 1', () => {
    const packed = packBits(strip, 8, 1, 'row-msb', darkPanel, false);
    expect(packed[0]).toBe(0xAA);
  });

  it('invert flips bits', () => {
    const packed = packBits(strip, 8, 1, 'row-msb', brightPanel, true);
    expect(packed[0]).toBe(0xAA);
  });

  it('invert on dark panel', () => {
    const packed = packBits(strip, 8, 1, 'row-msb', darkPanel, true);
    expect(packed[0]).toBe(0x55);
  });
});
