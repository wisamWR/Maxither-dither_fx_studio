import type { RGBAImage, GlitchConfig, GlitchResult } from '../types.js';

/** Mulberry32: simple seeded 32-bit PRNG */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function glitchEffect(img: RGBAImage, config: GlitchConfig): GlitchResult {
  const { width, height } = img;
  const src = img.data;
  const len = width * height * 4;

  // --- 1. Copy & apply brightness / contrast / invert ---
  const out = new Uint8ClampedArray(len);

  const bOff = (config.brightness / 100) * 255; // -255..255
  const cFactor =
    config.contrast === 0
      ? 1
      : config.contrast > 0
        ? 1 + config.contrast / 25  // up to ~5× at 100
        : (100 + config.contrast) / 100; // down to 0 at -100

  for (let i = 0; i < len; i += 4) {
    let r = src[i];
    let g = src[i + 1];
    let b = src[i + 2];

    if (config.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // contrast around midpoint 128
    r = (r - 128) * cFactor + 128 + bOff;
    g = (g - 128) * cFactor + 128 + bOff;
    b = (b - 128) * cFactor + 128 + bOff;

    out[i] = clamp(Math.round(r), 0, 255);
    out[i + 1] = clamp(Math.round(g), 0, 255);
    out[i + 2] = clamp(Math.round(b), 0, 255);
    out[i + 3] = src[i + 3]; // preserve alpha
  }

  const t = config.intensity / 100; // normalised 0-1
  if (t === 0) {
    return { data: out, width, height, glitch: true };
  }

  const rand = mulberry32(config.seed);

  // --- 2. Scanline displacement ---
  const bandCount = Math.max(1, config.scanlineCount);
  const bandH = Math.ceil(height / bandCount);
  const maxShift = Math.round(width * 0.25 * t); // up to 25% of width

  // Work on a second buffer so reads don't conflict with writes
  const displaced = new Uint8ClampedArray(out);

  for (let band = 0; band < bandCount; band++) {
    const shift = Math.round((rand() * 2 - 1) * maxShift);
    if (shift === 0) continue;

    const yStart = band * bandH;
    const yEnd = Math.min(yStart + bandH, height);

    for (let y = yStart; y < yEnd; y++) {
      for (let x = 0; x < width; x++) {
        let sx = x - shift;
        // wrap around
        if (sx < 0) sx += width;
        else if (sx >= width) sx -= width;

        const di = (y * width + x) * 4;
        const si = (y * width + sx) * 4;
        displaced[di] = out[si];
        displaced[di + 1] = out[si + 1];
        displaced[di + 2] = out[si + 2];
        displaced[di + 3] = out[si + 3];
      }
    }
  }

  // Copy displaced back into out
  out.set(displaced);

  // --- 3. RGB channel split ---
  if (config.rgbSplit) {
    const maxOff = Math.round(config.rgbSplitDistance * t);
    if (maxOff > 0) {
      // Snapshot before channel manipulation
      const snap = new Uint8ClampedArray(out);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const di = (y * width + x) * 4;

          // Red channel shifted left
          const rxSrc = clamp(x + maxOff, 0, width - 1);
          out[di] = snap[(y * width + rxSrc) * 4];

          // Green stays in place (already correct)

          // Blue channel shifted right
          const bxSrc = clamp(x - maxOff, 0, width - 1);
          out[di + 2] = snap[(y * width + bxSrc) * 4 + 2];
        }
      }
    }
  }

  // --- 4. Noise blocks ---
  const blockCount = Math.round(t * 10); // 0-10 random blocks
  for (let i = 0; i < blockCount; i++) {
    const bw = Math.round(rand() * width * 0.3 * t) + 1;
    const bh = Math.round(rand() * height * 0.1 * t) + 1;
    const dx = Math.floor(rand() * (width - bw));
    const dy = Math.floor(rand() * (height - bh));
    const sx = Math.floor(rand() * (width - bw));
    const sy = Math.floor(rand() * (height - bh));

    for (let by = 0; by < bh; by++) {
      for (let bx = 0; bx < bw; bx++) {
        const dstIdx = ((dy + by) * width + (dx + bx)) * 4;
        const srcIdx = ((sy + by) * width + (sx + bx)) * 4;
        out[dstIdx] = out[srcIdx];
        out[dstIdx + 1] = out[srcIdx + 1];
        out[dstIdx + 2] = out[srcIdx + 2];
        out[dstIdx + 3] = out[srcIdx + 3];
      }
    }
  }

  return { data: out, width, height, glitch: true };
}
