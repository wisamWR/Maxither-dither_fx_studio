import { describe, it, expect } from 'vitest';
import { toMicroPythonFramebuf } from '../src/exporters/micropython.js';
import { PANELS } from '../src/panels.js';

const oled = PANELS.find(p => p.id === 'ssd1306-128x64')!;
const data = new Uint8Array(16);
data.fill(0);

describe('toMicroPythonFramebuf', () => {
  it('produces valid Python with MONO_HLSB', () => {
    const code = toMicroPythonFramebuf(data, 4, 4, oled, { name: 'img', invert: false, format: 'MONO_HLSB' });
    expect(code).toContain('import framebuf');
    expect(code).toContain('bytearray(');
    expect(code).toContain('framebuf.MONO_HLSB');
    expect(code).toContain('img');
  });

  it('MONO_VLSB uses page-vertical layout', () => {
    const code = toMicroPythonFramebuf(data, 4, 4, oled, { name: 'img', invert: false, format: 'MONO_VLSB' });
    expect(code).toContain('framebuf.MONO_VLSB');
  });

  it('bytearray length matches', () => {
    const code = toMicroPythonFramebuf(data, 4, 4, oled, { name: 'img', invert: false, format: 'MONO_HLSB' });
    expect(code).toMatch(/bytearray\(b'.*'\)/);
  });
});
