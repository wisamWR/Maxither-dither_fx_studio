import type { Panel, CArrayOptions } from '../types.js';
import { packBits } from '../pack.js';

export function toCArray(
  data: Uint8Array,
  width: number,
  height: number,
  panel: Panel,
  opts: CArrayOptions,
): string {
  const packed = packBits(data, width, height, opts.layout, panel, opts.invert);
  const lines: string[] = [];

  if (opts.includeSize) {
    const prefix = opts.name.toUpperCase();
    lines.push(`#define ${prefix}_WIDTH ${width}`);
    lines.push(`#define ${prefix}_HEIGHT ${height}`);
    lines.push('');
  }

  const progmem = opts.progmem ? ' PROGMEM' : '';
  lines.push(`const unsigned char${progmem} ${opts.name}[] = {`);

  const hexValues: string[] = [];
  for (let i = 0; i < packed.length; i++) {
    hexValues.push(`0x${packed[i].toString(16).padStart(2, '0')}`);
  }

  for (let i = 0; i < hexValues.length; i += 16) {
    const chunk = hexValues.slice(i, i + 16);
    const comma = i + 16 < hexValues.length ? ',' : '';
    lines.push(`  ${chunk.join(', ')}${comma}`);
  }

  lines.push('};');
  return lines.join('\n');
}
