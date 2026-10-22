import { describe, it, expect } from 'vitest';
import { toCArray } from '../src/exporters/c-array.js';
import { PANELS } from '../src/panels.js';

const oled = PANELS.find(p => p.id === 'ssd1306-128x64')!;
const data = new Uint8Array(8);
data.fill(255);

describe('toCArray', () => {
  it('includes PROGMEM when enabled', () => {
    const code = toCArray(data, 8, 1, oled, { name: 'img', layout: 'row-msb', progmem: true, invert: false, includeSize: false });
    expect(code).toContain('PROGMEM');
    expect(code).toContain('img[]');
  });

  it('includes size defines when enabled', () => {
    const code = toCArray(data, 8, 1, oled, { name: 'img', layout: 'row-msb', progmem: false, invert: false, includeSize: true });
    expect(code).toContain('#define IMG_WIDTH 8');
    expect(code).toContain('#define IMG_HEIGHT 1');
  });

  it('different layouts produce different hex output', () => {
    const msb = toCArray(data, 8, 1, oled, { name: 'img', layout: 'row-msb', progmem: false, invert: false, includeSize: false });
    const lsb = toCArray(data, 8, 1, oled, { name: 'img', layout: 'row-lsb', progmem: false, invert: false, includeSize: false });
    expect(msb).toContain('0xff');
    expect(lsb).toContain('0xff');
  });
});
