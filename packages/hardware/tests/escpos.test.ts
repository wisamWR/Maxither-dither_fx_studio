import { describe, it, expect } from 'vitest';
import { toEscPosRaster } from '../src/exporters/escpos.js';
import { PANELS } from '../src/panels.js';

const thermal = PANELS.find(p => p.id === 'thermal-384')!;

describe('toEscPosRaster', () => {
  it('header is GS v 0 with correct bytes', () => {
    const data = new Uint8Array(16);
    data.fill(0);
    const result = toEscPosRaster(data, 4, 4, thermal, { scale: 0 });
    expect(result[0]).toBe(0x1D);
    expect(result[1]).toBe(0x76);
    expect(result[2]).toBe(0x30);
    expect(result[3]).toBe(0);
  });

  it('xL/xH = width in bytes, yL/yH = height in dots', () => {
    const data = new Uint8Array(16);
    const result = toEscPosRaster(data, 4, 4, thermal, { scale: 0 });
    expect(result[4]).toBe(0x01);
    expect(result[5]).toBe(0x00);
    expect(result[6]).toBe(0x04);
    expect(result[7]).toBe(0x00);
  });

  it('appends feed after image', () => {
    const data = new Uint8Array(8);
    const result = toEscPosRaster(data, 8, 1, thermal, { scale: 0, feedAfter: 3 });
    const len = result.length;
    expect(result[len - 1]).toBe(0x0A);
    expect(result[len - 2]).toBe(0x0A);
    expect(result[len - 3]).toBe(0x0A);
  });
});
