import type { Panel, MicroPythonOptions } from '../types.js';
import { packBits } from '../pack.js';

export function toMicroPythonFramebuf(
  data: Uint8Array,
  width: number,
  height: number,
  panel: Panel,
  opts: MicroPythonOptions,
): string {
  const layout = opts.format === 'MONO_HLSB' ? 'row-msb' as const : 'page-vertical' as const;
  const packed = packBits(data, width, height, layout, panel, opts.invert);

  const escaped = Array.from(packed)
    .map(b => `\\x${b.toString(16).padStart(2, '0')}`)
    .join('');

  const lines = [
    'import framebuf',
    '',
    `${opts.name} = bytearray(b'${escaped}')`,
    `fb = framebuf.FrameBuffer(${opts.name}, ${width}, ${height}, framebuf.${opts.format})`,
  ];

  return lines.join('\n');
}
