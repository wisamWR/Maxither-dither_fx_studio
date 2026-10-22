import type { Panel, EscPosOptions } from '../types.js';
import { packBits } from '../pack.js';

export function toEscPosRaster(
  data: Uint8Array,
  width: number,
  height: number,
  panel: Panel,
  opts: EscPosOptions,
): Uint8Array {
  const packed = packBits(data, width, height, 'row-msb', panel, false);
  const widthBytes = Math.ceil(width / 8);
  const feed = opts.feedAfter ?? 3;

  const header = new Uint8Array([
    0x1D, 0x76, 0x30, opts.scale,
    widthBytes & 0xFF, (widthBytes >> 8) & 0xFF,
    height & 0xFF, (height >> 8) & 0xFF,
  ]);

  const feedBytes = new Uint8Array(feed);
  feedBytes.fill(0x0A);

  const result = new Uint8Array(header.length + packed.length + feed);
  result.set(header, 0);
  result.set(packed, header.length);
  result.set(feedBytes, header.length + packed.length);

  return result;
}
