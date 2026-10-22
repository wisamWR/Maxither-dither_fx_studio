import { describe, it, expect } from 'vitest';
import { byteLength, packBits } from '../src/pack.js';
import { PANELS } from '../src/panels.js';

const oledPanel = PANELS.find(p => p.id === 'ssd1306-128x64')!;

describe('byteLength', () => {
  it('row layout: ceil(w/8) * h', () => {
    expect(byteLength(128, 64, 'row-msb')).toBe(1024);
    expect(byteLength(250, 122, 'row-msb')).toBe(3904);
    expect(byteLength(10, 10, 'row-lsb')).toBe(20);
  });

  it('page-vertical: w * ceil(h/8)', () => {
    expect(byteLength(128, 64, 'page-vertical')).toBe(1024);
    expect(byteLength(250, 122, 'page-vertical')).toBe(4000);
    expect(byteLength(10, 10, 'page-vertical')).toBe(20);
  });
});

describe('packBits padding', () => {
  it('padding bits are always 0, even with invert', () => {
    const data = new Uint8Array(10);
    data.fill(0);
    const packed = packBits(data, 10, 1, 'row-msb', oledPanel, true);
    const lastByte = packed[1];
    expect(lastByte & 0x3F).toBe(0);
  });
});
