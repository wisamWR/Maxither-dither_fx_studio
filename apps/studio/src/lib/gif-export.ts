/**
 * Minimal GIF89a animated encoder.
 * Zero dependencies - supports 256-color palette per frame with LZW compression.
 */

interface GifFrame {
  imageData: ImageData;
  delay: number; // centiseconds (e.g., 10 = 100ms)
}

// ---------------------------------------------------------------------------
// Binary helpers
// ---------------------------------------------------------------------------

class ByteStream {
  private chunks: Uint8Array[] = [];
  private buf = new Uint8Array(4096);
  private pos = 0;

  writeByte(b: number): void {
    if (this.pos >= this.buf.length) this.flush();
    this.buf[this.pos++] = b & 0xff;
  }

  writeBytes(bytes: Uint8Array | number[]): void {
    for (let i = 0; i < bytes.length; i++) this.writeByte(bytes[i]);
  }

  writeUint16LE(v: number): void {
    this.writeByte(v & 0xff);
    this.writeByte((v >> 8) & 0xff);
  }

  writeString(s: string): void {
    for (let i = 0; i < s.length; i++) this.writeByte(s.charCodeAt(i));
  }

  private flush(): void {
    this.chunks.push(this.buf.slice(0, this.pos));
    this.pos = 0;
  }

  toUint8Array(): Uint8Array {
    this.flush();
    let total = 0;
    for (const c of this.chunks) total += c.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Color quantization - median-cut to 256 colours
// ---------------------------------------------------------------------------

interface ColorBox {
  pixels: Uint32Array; // packed RGBA as 0xAABBGGRR
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
}

function packRGBA(r: number, g: number, b: number, _a: number): number {
  return (r | (g << 8) | (b << 16)) >>> 0;
}

function unpackR(c: number): number {
  return c & 0xff;
}
function unpackG(c: number): number {
  return (c >> 8) & 0xff;
}
function unpackB(c: number): number {
  return (c >> 16) & 0xff;
}

function computeBounds(pixels: Uint32Array): Omit<ColorBox, "pixels"> {
  let rMin = 255,
    rMax = 0,
    gMin = 255,
    gMax = 0,
    bMin = 255,
    bMax = 0;
  for (let i = 0; i < pixels.length; i++) {
    const c = pixels[i];
    const r = unpackR(c),
      g = unpackG(c),
      b = unpackB(c);
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
    if (g < gMin) gMin = g;
    if (g > gMax) gMax = g;
    if (b < bMin) bMin = b;
    if (b > bMax) bMax = b;
  }
  return { rMin, rMax, gMin, gMax, bMin, bMax };
}

function medianCut(
  imageData: ImageData,
  maxColors: number,
): { palette: Uint8Array; indices: Uint8Array } {
  const data = imageData.data;
  const pixelCount = imageData.width * imageData.height;

  // Build array of packed pixels
  const packed = new Uint32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    packed[i] = packRGBA(data[o], data[o + 1], data[o + 2], data[o + 3]);
  }

  // Deduplicate for quantization but keep mapping
  const uniqueMap = new Map<number, number>(); // color -> count
  for (let i = 0; i < packed.length; i++) {
    const c = packed[i];
    uniqueMap.set(c, (uniqueMap.get(c) || 0) + 1);
  }

  // If 256 or fewer unique colors, use them directly
  if (uniqueMap.size <= maxColors) {
    const colors = Array.from(uniqueMap.keys());
    const palette = new Uint8Array(maxColors * 3);
    const colorIndex = new Map<number, number>();
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i];
      palette[i * 3] = unpackR(c);
      palette[i * 3 + 1] = unpackG(c);
      palette[i * 3 + 2] = unpackB(c);
      colorIndex.set(c, i);
    }
    const indices = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      indices[i] = colorIndex.get(packed[i])!;
    }
    return { palette, indices };
  }

  // Median-cut: start with one box containing all unique colors
  const uniquePixels = new Uint32Array(uniqueMap.keys());
  const initialBounds = computeBounds(uniquePixels);
  const boxes: ColorBox[] = [{ pixels: uniquePixels, ...initialBounds }];

  while (boxes.length < maxColors) {
    // Find the box with the largest volume (range)
    let bestIdx = 0;
    let bestRange = -1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.pixels.length <= 1) continue;
      const range = Math.max(b.rMax - b.rMin, b.gMax - b.gMin, b.bMax - b.bMin);
      if (range > bestRange) {
        bestRange = range;
        bestIdx = i;
      }
    }

    if (bestRange <= 0) break; // can't split further

    const box = boxes[bestIdx];
    const rRange = box.rMax - box.rMin;
    const gRange = box.gMax - box.gMin;
    const bRange = box.bMax - box.bMin;

    // Sort along the longest axis
    let sortFn: (a: number, b: number) => number;
    if (rRange >= gRange && rRange >= bRange) {
      sortFn = (a, b) => unpackR(a) - unpackR(b);
    } else if (gRange >= rRange && gRange >= bRange) {
      sortFn = (a, b) => unpackG(a) - unpackG(b);
    } else {
      sortFn = (a, b) => unpackB(a) - unpackB(b);
    }

    const sorted = Array.from(box.pixels).sort(sortFn);
    const mid = sorted.length >> 1;

    const left = new Uint32Array(sorted.slice(0, mid));
    const right = new Uint32Array(sorted.slice(mid));
    const lb = computeBounds(left);
    const rb = computeBounds(right);

    boxes[bestIdx] = { pixels: left, ...lb };
    boxes.push({ pixels: right, ...rb });
  }

  // Compute average color for each box
  const palette = new Uint8Array(maxColors * 3);
  const paletteColors: number[] = []; // packed averages for nearest-color lookup
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    let rSum = 0,
      gSum = 0,
      bSum = 0;
    for (let j = 0; j < box.pixels.length; j++) {
      rSum += unpackR(box.pixels[j]);
      gSum += unpackG(box.pixels[j]);
      bSum += unpackB(box.pixels[j]);
    }
    const n = box.pixels.length;
    const rAvg = Math.round(rSum / n);
    const gAvg = Math.round(gSum / n);
    const bAvg = Math.round(bSum / n);
    palette[i * 3] = rAvg;
    palette[i * 3 + 1] = gAvg;
    palette[i * 3 + 2] = bAvg;
    paletteColors.push(packRGBA(rAvg, gAvg, bAvg, 255));
  }

  // Map each pixel to its nearest palette entry
  // Build a cache for speed - there are at most uniqueMap.size entries
  const nearestCache = new Map<number, number>();

  function findNearest(c: number): number {
    const cached = nearestCache.get(c);
    if (cached !== undefined) return cached;
    const r = unpackR(c),
      g = unpackG(c),
      b = unpackB(c);
    let bestDist = Infinity;
    let bestI = 0;
    for (let i = 0; i < paletteColors.length; i++) {
      const pr = unpackR(paletteColors[i]);
      const pg = unpackG(paletteColors[i]);
      const pb = unpackB(paletteColors[i]);
      const dr = r - pr,
        dg = g - pg,
        db = b - pb;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestI = i;
      }
      if (dist === 0) break;
    }
    nearestCache.set(c, bestI);
    return bestI;
  }

  const indices = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    indices[i] = findNearest(packed[i]);
  }

  return { palette, indices };
}

// ---------------------------------------------------------------------------
// LZW compressor for GIF
// ---------------------------------------------------------------------------

function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  // Output bit stream, packed LSB-first into sub-blocks
  const output: number[] = [];
  let curByte = 0;
  let curBits = 0;

  // Sub-block buffer: max 255 bytes per sub-block
  const subBlock: number[] = [];

  function flushSubBlock(): void {
    if (subBlock.length > 0) {
      output.push(subBlock.length);
      for (let i = 0; i < subBlock.length; i++) output.push(subBlock[i]);
      subBlock.length = 0;
    }
  }

  function emitCode(code: number, codeSize: number): void {
    curByte |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      subBlock.push(curByte & 0xff);
      curByte >>= 8;
      curBits -= 8;
      if (subBlock.length >= 255) {
        flushSubBlock();
      }
    }
  }

  // Initialize string table
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxTableSize = 4096;

  // Use a hash-map approach for the string table.
  // Key: (prefix << 12) | suffix, Value: code
  // This works because suffix is always 0-255 and prefix < 4096
  let table = new Map<number, number>();

  function resetTable(): void {
    table = new Map();
    for (let i = 0; i < clearCode; i++) {
      table.set((0xfff << 12) | i, i); // prefix=0xFFF (sentinel "no prefix"), suffix=i
    }
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  }

  function tableKey(prefix: number, suffix: number): number {
    return (prefix << 12) | suffix;
  }

  // Start encoding
  resetTable();
  emitCode(clearCode, codeSize);

  if (indices.length === 0) {
    emitCode(eoiCode, codeSize);
    // Flush remaining bits
    if (curBits > 0) {
      subBlock.push(curByte & 0xff);
    }
    flushSubBlock();
    output.push(0); // block terminator
    return new Uint8Array(output);
  }

  let prefix = indices[0]; // start with first pixel as prefix (it's a root code)

  for (let i = 1; i < indices.length; i++) {
    const suffix = indices[i];
    const key = tableKey(prefix, suffix);
    const existing = table.get(key);

    if (existing !== undefined) {
      prefix = existing;
    } else {
      // Output the code for prefix
      emitCode(prefix, codeSize);

      // Add prefix+suffix to table
      if (nextCode < maxTableSize) {
        table.set(key, nextCode);
        nextCode++;
        // Check if we need to increase code size
        if (nextCode > 1 << codeSize && codeSize < 12) {
          codeSize++;
        }
      } else {
        // Table is full, emit clear and reset
        emitCode(clearCode, codeSize);
        resetTable();
      }

      prefix = suffix;
    }
  }

  // Output the remaining prefix
  emitCode(prefix, codeSize);
  emitCode(eoiCode, codeSize);

  // Flush remaining bits
  if (curBits > 0) {
    subBlock.push(curByte & 0xff);
  }
  flushSubBlock();
  output.push(0); // block terminator

  return new Uint8Array(output);
}

// ---------------------------------------------------------------------------
// GIF89a encoder
// ---------------------------------------------------------------------------

export async function encodeGif(
  frames: GifFrame[],
  width: number,
  height: number,
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error("At least one frame is required");
  }

  const stream = new ByteStream();

  // --- Header ---
  stream.writeString("GIF89a");

  // --- Logical Screen Descriptor ---
  stream.writeUint16LE(width);
  stream.writeUint16LE(height);

  // Use a global color table of 256 entries (from the first frame)
  // Packed field: GCT flag=1, color resolution=7 (8 bits), sort=0, GCT size=7 (256 entries)
  const colorTableBits = 8;
  const colorTableSize = 1 << colorTableBits; // 256
  stream.writeByte(0x80 | ((colorTableBits - 1) << 4) | (colorTableBits - 1)); // 0xF7
  stream.writeByte(0); // background color index
  stream.writeByte(0); // pixel aspect ratio

  // Quantize first frame to build global color table
  const firstQ = medianCut(frames[0].imageData, colorTableSize);

  // --- Global Color Table ---
  for (let i = 0; i < colorTableSize; i++) {
    stream.writeByte(firstQ.palette[i * 3] || 0);
    stream.writeByte(firstQ.palette[i * 3 + 1] || 0);
    stream.writeByte(firstQ.palette[i * 3 + 2] || 0);
  }

  // --- Application Extension (NETSCAPE2.0 for looping) ---
  if (frames.length > 1) {
    stream.writeByte(0x21); // extension introducer
    stream.writeByte(0xff); // application extension
    stream.writeByte(0x0b); // block size (11)
    stream.writeString("NETSCAPE2.0");
    stream.writeByte(0x03); // sub-block size
    stream.writeByte(0x01); // sub-block ID
    stream.writeUint16LE(0); // loop count (0 = infinite)
    stream.writeByte(0x00); // block terminator
  }

  // --- Frames ---
  for (let fi = 0; fi < frames.length; fi++) {
    const frame = frames[fi];
    const delay = frame.delay;

    // Quantize this frame
    // For the first frame, reuse the already-computed quantization
    let indices: Uint8Array;
    let localPalette: Uint8Array | null = null;
    let useLocalTable = false;

    if (fi === 0) {
      indices = firstQ.indices;
    } else {
      // Quantize subsequent frames - use a local color table
      const q = medianCut(frame.imageData, colorTableSize);
      indices = q.indices;
      localPalette = q.palette;
      useLocalTable = true;
    }

    // --- Graphic Control Extension ---
    stream.writeByte(0x21); // extension introducer
    stream.writeByte(0xf9); // graphic control label
    stream.writeByte(0x04); // block size
    // Packed: disposal=0 (none), user input=0, transparent=0
    stream.writeByte(0x00);
    stream.writeUint16LE(delay);
    stream.writeByte(0x00); // transparent color index (unused)
    stream.writeByte(0x00); // block terminator

    // --- Image Descriptor ---
    stream.writeByte(0x2c); // image separator
    stream.writeUint16LE(0); // left
    stream.writeUint16LE(0); // top
    stream.writeUint16LE(width);
    stream.writeUint16LE(height);

    if (useLocalTable && localPalette) {
      // Local color table: flag=1, interlace=0, sort=0, size=7 (256 entries)
      stream.writeByte(0x80 | (colorTableBits - 1)); // 0x87
      for (let i = 0; i < colorTableSize; i++) {
        stream.writeByte(localPalette[i * 3] || 0);
        stream.writeByte(localPalette[i * 3 + 1] || 0);
        stream.writeByte(localPalette[i * 3 + 2] || 0);
      }
    } else {
      stream.writeByte(0x00); // no local color table, no interlace
    }

    // --- LZW Image Data ---
    const minCodeSize = colorTableBits; // 8 for 256 colors
    stream.writeByte(minCodeSize);

    // LZW encode the indices and write sub-blocks
    const lzwData = lzwEncode(indices, minCodeSize);
    stream.writeBytes(lzwData);
  }

  // --- Trailer ---
  stream.writeByte(0x3b);

  const data = stream.toUint8Array();
  return new Blob([data], { type: "image/gif" });
}

// ---------------------------------------------------------------------------
// Convenience functions
// ---------------------------------------------------------------------------

/**
 * Capture frames from canvas by varying a parameter, then encode as GIF.
 * The caller should update the canvas between captures via the onFrame callback.
 */
export async function recordCanvasGif(
  canvas: HTMLCanvasElement,
  frameCount: number,
  delayMs: number,
  onFrame?: (frameIndex: number) => void | Promise<void>,
): Promise<Blob> {
  const ctx = canvas.getContext("2d")!;
  const width = canvas.width;
  const height = canvas.height;
  const frames: GifFrame[] = [];
  const delayCentiseconds = Math.max(1, Math.round(delayMs / 10));

  for (let i = 0; i < frameCount; i++) {
    if (onFrame) {
      await onFrame(i);
    }
    const imageData = ctx.getImageData(0, 0, width, height);
    frames.push({ imageData, delay: delayCentiseconds });
  }

  return encodeGif(frames, width, height);
}

/**
 * Capture a single-frame GIF snapshot of the current canvas state.
 */
export async function captureCanvasAsGif(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return encodeGif([{ imageData, delay: 0 }], canvas.width, canvas.height);
}

/**
 * Download a GIF blob as a file.
 */
export function downloadGif(blob: Blob, filename = "maxither.gif"): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type { GifFrame };
