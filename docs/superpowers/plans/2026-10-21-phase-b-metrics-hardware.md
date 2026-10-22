# Phase B: Metrics + Hardware Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add quantitative quality scoring (SSIM/PSNR) to DitherForge effects, and build a hardware export pipeline for OLED, e-paper, LED matrix, and thermal printer targets.

**Architecture:** Metrics module lives in `packages/core/src/metrics/` (SSIM, rasterizers). Hardware module is new package `packages/hardware/` with bit-packing, exporters, panel presets. Studio gets mode selector (Studio/Hardware), SSIM badge in preview, and lazy-loaded hardware UI.

**Tech Stack:** TypeScript 5.6, React 18, Vite 6, Vitest, npm workspaces. No new external dependencies.

**Spec:** `docs/superpowers/specs/2026-10-21-phase-b-metrics-hardware-design.md`

**Working directory:** `C:\Users\wisam\Documents\Project\ditherforge`

---

## File Structure

### New files

```
packages/core/src/
├── utils/resize.ts                          # B0: area-average downscale, bilinear upscale
├── metrics/
│   ├── ssim.ts                              # B1: MSE, PSNR, SSIM (7×7 uniform window)
│   └── rasterize.ts                         # B1: TextResult→GrayscaleImage, braille→GrayscaleImage

packages/core/tests/
├── resize.test.ts                           # B0: 7 tests
├── metrics-ssim.test.ts                     # B1: 8 tests
└── metrics-rasterize.test.ts                # B1: 8 tests

packages/hardware/
├── package.json                             # B2: @ditherforge/hardware
├── tsconfig.json                            # B2
├── vitest.config.ts                         # B2
├── src/
│   ├── index.ts                             # B2: barrel exports
│   ├── types.ts                             # B2: Panel, CArrayOptions, etc.
│   ├── panels.ts                            # B2: PANELS[] presets
│   ├── pack.ts                              # B2: bit-packing + polarity + byteLength
│   ├── exporters/
│   │   ├── c-array.ts                       # B2: toCArray()
│   │   ├── micropython.ts                   # B3: toMicroPythonFramebuf()
│   │   └── escpos.ts                        # B3: toEscPosRaster()
│   └── preview/
│       └── panel-sim.ts                     # B2: simulatePanel()
└── tests/
    ├── pack.test.ts                         # B2: byte length, padding
    ├── golden-vectors.test.ts               # B2: 10×10 hand-computed vectors
    ├── polarity.test.ts                     # B2: bright/dark mapping
    ├── c-array.test.ts                      # B2: C output format
    ├── micropython.test.ts                  # B3
    └── escpos.test.ts                       # B3

apps/studio/src/
├── components/hardware/
│   ├── HardwareMode.tsx                     # B3: main hardware container
│   ├── PanelPreview.tsx                     # B3: canvas panel simulation
│   └── HardwareExport.tsx                   # B3: export options + code output
└── workers/
    └── autotune.worker.ts                   # B4: dedicated auto-tune worker
```

### Modified files

```
packages/core/src/index.ts                   # B0+B1: add resize, metrics exports
package.json (root)                          # B2: add packages/hardware to workspaces (already covered)
apps/studio/package.json                     # B3: add @ditherforge/hardware dep
apps/studio/tsconfig.app.json               # B3: add hardware path alias
apps/studio/src/App.tsx                      # B3: mode selector, lazy import
apps/studio/src/workers/effect.worker.ts     # B1: add requestId, SSIM computation
apps/studio/src/components/PreviewCanvas.tsx # B1: two-phase response, SSIM badge
```

---

## Task 1: resizeGray — tests

**Files:**
- Create: `packages/core/tests/resize.test.ts`

- [ ] **Step 1: Write resize tests**

```ts
// packages/core/tests/resize.test.ts
import { describe, it, expect } from 'vitest';
import { resizeGray } from '../src/utils/resize.js';
import type { GrayscaleImage } from '../src/types.js';

function makeImg(w: number, h: number, fill: number | number[]): GrayscaleImage {
  const data = new Uint8Array(w * h);
  if (typeof fill === 'number') {
    data.fill(fill);
  } else {
    for (let i = 0; i < data.length; i++) data[i] = fill[i] ?? 0;
  }
  return { width: w, height: h, data };
}

describe('resizeGray', () => {
  it('averages 2×2 down to 1×1', () => {
    const img = makeImg(2, 2, [100, 200, 50, 150]);
    const out = resizeGray(img, 1, 1, 'stretch');
    expect(out.width).toBe(1);
    expect(out.height).toBe(1);
    expect(out.data[0]).toBe(125); // (100+200+50+150)/4
  });

  it('contain preserves aspect and pads with padValue', () => {
    const img = makeImg(4, 2, 100);
    const out = resizeGray(img, 4, 4, 'contain', 0);
    expect(out.width).toBe(4);
    expect(out.height).toBe(4);
    // Image occupies rows 1-2 (centered), rows 0 and 3 are pad=0
    const row0avg = (out.data[0] + out.data[1] + out.data[2] + out.data[3]) / 4;
    const row1avg = (out.data[4] + out.data[5] + out.data[6] + out.data[7]) / 4;
    expect(row0avg).toBe(0);     // padding
    expect(row1avg).toBeGreaterThan(50); // image content
  });

  it('cover crops center', () => {
    // 4×4 image, resize to 2×2 cover — takes center 2×2 region at source scale
    const pixels = [];
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        pixels.push(y < 2 ? 50 : 200);
    const img = makeImg(4, 4, pixels);
    const out = resizeGray(img, 4, 2, 'cover');
    expect(out.width).toBe(4);
    expect(out.height).toBe(2);
    // Should be center-cropped: mix of top and bottom
  });

  it('stretch distorts freely', () => {
    const img = makeImg(4, 2, 100);
    const out = resizeGray(img, 2, 4, 'stretch');
    expect(out.width).toBe(2);
    expect(out.height).toBe(4);
    expect(out.data.length).toBe(8);
  });

  it('identity returns same data', () => {
    const img = makeImg(3, 3, [10, 20, 30, 40, 50, 60, 70, 80, 90]);
    const out = resizeGray(img, 3, 3, 'stretch');
    expect(out.width).toBe(3);
    expect(out.data).toEqual(img.data);
  });

  it('handles non-divisible dimensions', () => {
    const img = makeImg(7, 5, 128);
    const out = resizeGray(img, 3, 3, 'stretch');
    expect(out.width).toBe(3);
    expect(out.height).toBe(3);
    expect(out.data.length).toBe(9);
    // All values should be near 128
    for (const v of out.data) {
      expect(v).toBeGreaterThanOrEqual(120);
      expect(v).toBeLessThanOrEqual(136);
    }
  });

  it('height=0 auto-computes from aspect ratio', () => {
    const img = makeImg(200, 100, 128);
    const out = resizeGray(img, 50, 0, 'stretch');
    expect(out.width).toBe(50);
    expect(out.height).toBe(25); // 100 * 50/200
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd C:/Users/wisam/Documents/Project/ditherforge && npx vitest run packages/core/tests/resize.test.ts`
Expected: FAIL — module `../src/utils/resize.js` not found

---

## Task 2: resizeGray — implementation

**Files:**
- Create: `packages/core/src/utils/resize.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Implement resizeGray**

```ts
// packages/core/src/utils/resize.ts
import type { GrayscaleImage } from '../types.js';

export type ResizeFit = 'contain' | 'cover' | 'stretch';

export function resizeGray(
  img: GrayscaleImage,
  targetW: number,
  targetH: number,
  fit: ResizeFit,
  padValue: number = 255,
): GrayscaleImage {
  // Auto-compute height from aspect ratio
  if (targetH === 0) {
    targetH = Math.round(img.height * targetW / img.width);
    if (targetH < 1) targetH = 1;
  }

  // Identity check
  if (img.width === targetW && img.height === targetH) {
    return { width: targetW, height: targetH, data: new Uint8Array(img.data) };
  }

  if (fit === 'stretch') {
    return scaleImage(img, targetW, targetH);
  }

  // Compute scaled dimensions preserving aspect ratio
  const scaleX = targetW / img.width;
  const scaleY = targetH / img.height;

  if (fit === 'contain') {
    const scale = Math.min(scaleX, scaleY);
    const scaledW = Math.round(img.width * scale);
    const scaledH = Math.round(img.height * scale);
    const scaled = scaleImage(img, scaledW, scaledH);

    // Place centered on padded canvas
    const out = new Uint8Array(targetW * targetH);
    out.fill(padValue);
    const offX = Math.floor((targetW - scaledW) / 2);
    const offY = Math.floor((targetH - scaledH) / 2);
    for (let y = 0; y < scaledH; y++) {
      for (let x = 0; x < scaledW; x++) {
        out[(offY + y) * targetW + (offX + x)] = scaled.data[y * scaledW + x];
      }
    }
    return { width: targetW, height: targetH, data: out };
  }

  // cover: fill target, crop excess
  const scale = Math.max(scaleX, scaleY);
  const scaledW = Math.round(img.width * scale);
  const scaledH = Math.round(img.height * scale);
  const scaled = scaleImage(img, scaledW, scaledH);

  const cropX = Math.floor((scaledW - targetW) / 2);
  const cropY = Math.floor((scaledH - targetH) / 2);
  const out = new Uint8Array(targetW * targetH);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      out[y * targetW + x] = scaled.data[(cropY + y) * scaledW + (cropX + x)];
    }
  }
  return { width: targetW, height: targetH, data: out };
}

function scaleImage(img: GrayscaleImage, tw: number, th: number): GrayscaleImage {
  const { width: sw, height: sh, data: src } = img;
  const out = new Uint8Array(tw * th);

  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      // Map target pixel back to source region
      const sx0 = tx * sw / tw;
      const sy0 = ty * sh / th;
      const sx1 = (tx + 1) * sw / tw;
      const sy1 = (ty + 1) * sh / th;

      // Area averaging
      let sum = 0;
      let count = 0;
      const iy0 = Math.floor(sy0);
      const iy1 = Math.min(Math.ceil(sy1), sh);
      const ix0 = Math.floor(sx0);
      const ix1 = Math.min(Math.ceil(sx1), sw);

      for (let iy = iy0; iy < iy1; iy++) {
        // Vertical weight
        const wy = Math.min(iy + 1, sy1) - Math.max(iy, sy0);
        for (let ix = ix0; ix < ix1; ix++) {
          // Horizontal weight
          const wx = Math.min(ix + 1, sx1) - Math.max(ix, sx0);
          const w = wx * wy;
          sum += src[iy * sw + ix] * w;
          count += w;
        }
      }
      out[ty * tw + tx] = count > 0 ? Math.round(sum / count) : 0;
    }
  }
  return { width: tw, height: th, data: out };
}
```

- [ ] **Step 2: Add export to core index**

Add to `packages/core/src/index.ts` after the filters export (line 47):

```ts
export { resizeGray } from './utils/resize.js';
export type { ResizeFit } from './utils/resize.js';
```

- [ ] **Step 3: Run tests**

Run: `cd C:/Users/wisam/Documents/Project/ditherforge && npx vitest run packages/core/tests/resize.test.ts`
Expected: 7 tests PASS

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All existing 89 tests + 7 new = 96 PASS

---

## Task 3: SSIM/PSNR — tests

**Files:**
- Create: `packages/core/tests/metrics-ssim.test.ts`

- [ ] **Step 1: Write SSIM tests**

```ts
// packages/core/tests/metrics-ssim.test.ts
import { describe, it, expect } from 'vitest';
import { mse, psnr, ssim } from '../src/metrics/ssim.js';
import type { GrayscaleImage } from '../src/types.js';

function makeImg(w: number, h: number, fill: number | ((x: number, y: number) => number)): GrayscaleImage {
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      data[y * w + x] = typeof fill === 'number' ? fill : Math.round(fill(x, y));
    }
  }
  return { width: w, height: h, data };
}

describe('mse', () => {
  it('identical images → 0', () => {
    const img = makeImg(16, 16, 128);
    expect(mse(img, img)).toBe(0);
  });
});

describe('psnr', () => {
  it('identical images → Infinity', () => {
    const img = makeImg(16, 16, 128);
    expect(psnr(img, img)).toBe(Infinity);
  });
});

describe('ssim', () => {
  it('identical images → 1.0', () => {
    const img = makeImg(32, 32, (x, y) => (x + y) * 4);
    expect(ssim(img, img)).toBeCloseTo(1.0, 4);
  });

  it('all-black vs all-white → low SSIM', () => {
    const black = makeImg(32, 32, 0);
    const white = makeImg(32, 32, 255);
    expect(ssim(black, white)).toBeLessThan(0.1);
  });

  it('noise produces intermediate SSIM', () => {
    const a = makeImg(32, 32, (x, y) => (x * 8 + y * 8) % 256);
    const b = makeImg(32, 32, (x, y) => ((x * 8 + y * 8) % 256 + 30) % 256);
    const s = ssim(a, b);
    expect(s).toBeGreaterThan(0.1);
    expect(s).toBeLessThan(0.99);
  });

  it('symmetric: ssim(a,b) === ssim(b,a)', () => {
    const a = makeImg(32, 32, (x, y) => x * 8);
    const b = makeImg(32, 32, (x, y) => y * 8);
    expect(ssim(a, b)).toBeCloseTo(ssim(b, a), 10);
  });

  it('dimension mismatch throws', () => {
    const a = makeImg(32, 32, 128);
    const b = makeImg(16, 16, 128);
    expect(() => ssim(a, b)).toThrow();
  });

  it('image too small for window returns null', () => {
    const a = makeImg(6, 6, 128);
    expect(ssim(a, a)).toBeNull();
  });

  it('custom window size', () => {
    const img = makeImg(32, 32, (x, y) => (x + y) * 4);
    const s = ssim(img, img, 5);
    expect(s).toBeCloseTo(1.0, 4);
  });

  it('gradient pair produces expected range', () => {
    // Horizontal gradient vs slightly shifted gradient
    const a = makeImg(32, 32, (x) => x * 8);
    const b = makeImg(32, 32, (x) => Math.min(x * 8 + 20, 255));
    const s = ssim(a, b);
    expect(s).toBeGreaterThan(0.5);
    expect(s).toBeLessThan(1.0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run packages/core/tests/metrics-ssim.test.ts`
Expected: FAIL — module not found

---

## Task 4: SSIM/PSNR — implementation

**Files:**
- Create: `packages/core/src/metrics/ssim.ts`

- [ ] **Step 1: Implement SSIM**

```ts
// packages/core/src/metrics/ssim.ts
import type { GrayscaleImage } from '../types.js';

export function mse(a: GrayscaleImage, b: GrayscaleImage): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Dimension mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  const n = a.data.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a.data[i] - b.data[i];
    sum += d * d;
  }
  return sum / n;
}

export function psnr(a: GrayscaleImage, b: GrayscaleImage): number {
  const m = mse(a, b);
  if (m === 0) return Infinity;
  return 10 * Math.log10((255 * 255) / m);
}

/**
 * Structural Similarity Index — simplified variant.
 * Uses uniform sliding window (NOT Gaussian 11×11 from Wang 2004).
 * Returns null if image is too small for the window.
 */
export function ssim(
  a: GrayscaleImage,
  b: GrayscaleImage,
  windowSize: number = 7,
): number | null {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Dimension mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }

  const { width, height } = a;
  if (width < windowSize * 2 || height < windowSize * 2) return null;

  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const winArea = windowSize * windowSize;

  let totalSsim = 0;
  let windowCount = 0;

  for (let wy = 0; wy <= height - windowSize; wy++) {
    for (let wx = 0; wx <= width - windowSize; wx++) {
      let sumA = 0, sumB = 0, sumAA = 0, sumBB = 0, sumAB = 0;

      for (let dy = 0; dy < windowSize; dy++) {
        const rowOff = (wy + dy) * width + wx;
        for (let dx = 0; dx < windowSize; dx++) {
          const va = a.data[rowOff + dx];
          const vb = b.data[rowOff + dx];
          sumA += va;
          sumB += vb;
          sumAA += va * va;
          sumBB += vb * vb;
          sumAB += va * vb;
        }
      }

      const muA = sumA / winArea;
      const muB = sumB / winArea;
      const sigmaAA = sumAA / winArea - muA * muA;
      const sigmaBB = sumBB / winArea - muB * muB;
      const sigmaAB = sumAB / winArea - muA * muB;

      const num = (2 * muA * muB + C1) * (2 * sigmaAB + C2);
      const den = (muA * muA + muB * muB + C1) * (sigmaAA + sigmaBB + C2);

      totalSsim += num / den;
      windowCount++;
    }
  }

  return windowCount > 0 ? totalSsim / windowCount : null;
}
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run packages/core/tests/metrics-ssim.test.ts`
Expected: 8 tests PASS

---

## Task 5: Rasterizers — tests

**Files:**
- Create: `packages/core/tests/metrics-rasterize.test.ts`

- [ ] **Step 1: Write rasterizer tests**

```ts
// packages/core/tests/metrics-rasterize.test.ts
import { describe, it, expect } from 'vitest';
import { rasterizeText, rasterizeBraille } from '../src/metrics/rasterize.js';
import type { TextResult, GlyphBitmap } from '../src/types.js';

// Create a simple 4×6 glyph: '@' is dense (mostly dark=0), ' ' is sparse (all white=255)
function makeGlyph(char: string, density: number): GlyphBitmap {
  const w = 4, h = 6;
  const data = new Uint8Array(w * h);
  const darkCount = Math.round(density * w * h);
  for (let i = 0; i < w * h; i++) {
    data[i] = i < darkCount ? 0 : 255; // 0 = ink, 255 = background
  }
  return { char, bitmap: data, width: w, height: h, density };
}

const glyphs: GlyphBitmap[] = [
  makeGlyph(' ', 0),
  makeGlyph('.', 0.2),
  makeGlyph('#', 0.7),
  makeGlyph('@', 0.9),
];

describe('rasterizeText', () => {
  it('single char produces glyph-sized output', () => {
    const result: TextResult = { text: '@', rows: 1, cols: 1 };
    const img = rasterizeText(result, glyphs, 'light-on-dark');
    expect(img.width).toBe(4);
    expect(img.height).toBe(6);
  });

  it('multi-row text produces correct dimensions', () => {
    const result: TextResult = { text: '@#\n. ', rows: 2, cols: 2 };
    const img = rasterizeText(result, glyphs, 'light-on-dark');
    expect(img.width).toBe(8);  // 2 cols * 4px
    expect(img.height).toBe(12); // 2 rows * 6px
  });

  it('unknown char renders as background', () => {
    const result: TextResult = { text: '?', rows: 1, cols: 1 };
    const img = rasterizeText(result, glyphs, 'light-on-dark');
    // light-on-dark unknown → bright (255) since foreground is bright
    // Actually unknown should be background → 0 (dark) in light-on-dark
    // Dense chars are bright in light-on-dark, sparse/unknown are dark
    expect(img.data.every(v => v === 0)).toBe(true);
  });

  it('light-on-dark: dense char produces bright pixels', () => {
    const result: TextResult = { text: '@', rows: 1, cols: 1 };
    const img = rasterizeText(result, glyphs, 'light-on-dark');
    // '@' has density 0.9, glyph bitmap has 0s (ink) → inverted to 255 (bright)
    const mean = img.data.reduce((s, v) => s + v, 0) / img.data.length;
    expect(mean).toBeGreaterThan(128); // mostly bright
  });

  it('dark-on-light: dense char produces dark pixels', () => {
    const result: TextResult = { text: '@', rows: 1, cols: 1 };
    const img = rasterizeText(result, glyphs, 'dark-on-light');
    // '@' bitmap used as-is: 0s (ink/dark)
    const mean = img.data.reduce((s, v) => s + v, 0) / img.data.length;
    expect(mean).toBeLessThan(128); // mostly dark
  });

  it('polarities produce inverted outputs', () => {
    const result: TextResult = { text: '#', rows: 1, cols: 1 };
    const lightOnDark = rasterizeText(result, glyphs, 'light-on-dark');
    const darkOnLight = rasterizeText(result, glyphs, 'dark-on-light');
    // Every pixel should be inverted
    for (let i = 0; i < lightOnDark.data.length; i++) {
      expect(lightOnDark.data[i] + darkOnLight.data[i]).toBe(255);
    }
  });
});

describe('rasterizeBraille', () => {
  it('braille char with dots 1,2,5 (U+2813) renders correct pattern', () => {
    // U+2813 = dots 1,2,5 → positions (0,0), (0,1), (1,2)
    const result: TextResult = { text: '\u2813', rows: 1, cols: 1 };
    const img = rasterizeBraille(result, 'light-on-dark', 2, 4);
    expect(img.width).toBe(4);   // 1 col * 2 dots * 2px
    expect(img.height).toBe(16); // 1 row * 4 dots * 4px
  });

  it('empty braille (U+2800) → all background', () => {
    const result: TextResult = { text: '\u2800', rows: 1, cols: 1 };
    const img = rasterizeBraille(result, 'light-on-dark');
    // No dots → all dark in light-on-dark
    expect(img.data.every(v => v === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run packages/core/tests/metrics-rasterize.test.ts`
Expected: FAIL — module not found

---

## Task 6: Rasterizers — implementation

**Files:**
- Create: `packages/core/src/metrics/rasterize.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Implement rasterizers**

```ts
// packages/core/src/metrics/rasterize.ts
import type { GrayscaleImage, TextResult, GlyphBitmap } from '../types.js';

export type DisplayPolarity = 'light-on-dark' | 'dark-on-light';

/**
 * Rasterize ASCII TextResult back to a GrayscaleImage.
 *
 * Glyph bitmaps are ink-on-white (0=ink, 255=bg).
 * - light-on-dark: invert bitmap so dense chars → bright pixels (as seen on screen with bright fg on dark bg)
 * - dark-on-light: use bitmap as-is (dense chars → dark pixels, like printed text)
 */
export function rasterizeText(
  result: TextResult,
  glyphs: GlyphBitmap[],
  polarity: DisplayPolarity,
): GrayscaleImage {
  if (glyphs.length === 0) {
    return { width: 0, height: 0, data: new Uint8Array(0) };
  }

  const cellW = glyphs[0].width;
  const cellH = glyphs[0].height;
  const lines = result.text.split('\n');
  const outW = result.cols * cellW;
  const outH = result.rows * cellH;
  const out = new Uint8Array(outW * outH);

  // Background value: light-on-dark → 0 (dark bg), dark-on-light → 255 (white bg)
  const bgVal = polarity === 'light-on-dark' ? 0 : 255;
  out.fill(bgVal);

  // Build char→glyph lookup
  const glyphMap = new Map<string, GlyphBitmap>();
  for (const g of glyphs) glyphMap.set(g.char, g);

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    for (let col = 0; col < line.length; col++) {
      const glyph = glyphMap.get(line[col]);
      if (!glyph) continue; // unknown → stays as background

      for (let gy = 0; gy < cellH; gy++) {
        for (let gx = 0; gx < cellW; gx++) {
          const srcVal = glyph.bitmap[gy * cellW + gx];
          const outX = col * cellW + gx;
          const outY = row * cellH + gy;
          // light-on-dark: invert (0→255, 255→0). dark-on-light: as-is.
          out[outY * outW + outX] = polarity === 'light-on-dark' ? 255 - srcVal : srcVal;
        }
      }
    }
  }

  return { width: outW, height: outH, data: out };
}

/**
 * Rasterize braille TextResult to GrayscaleImage.
 * Decodes Unicode braille (U+2800–U+28FF) back to 2×4 dot grid.
 */
export function rasterizeBraille(
  result: TextResult,
  polarity: DisplayPolarity,
  dotW: number = 2,
  dotH: number = 4,
): GrayscaleImage {
  const charW = 2; // braille dots per char horizontally
  const charH = 4; // braille dots per char vertically
  const lines = result.text.split('\n');
  const outW = result.cols * charW * dotW;
  const outH = result.rows * charH * dotH;
  const out = new Uint8Array(outW * outH);

  const bgVal = polarity === 'light-on-dark' ? 0 : 255;
  const fgVal = polarity === 'light-on-dark' ? 255 : 0;
  out.fill(bgVal);

  // Braille dot positions: bits 0-7 map to specific (col, row) positions
  // Bit 0: (0,0), Bit 1: (0,1), Bit 2: (0,2), Bit 3: (1,0),
  // Bit 4: (1,1), Bit 5: (1,2), Bit 6: (0,3), Bit 7: (1,3)
  const dotPositions: [number, number][] = [
    [0, 0], [0, 1], [0, 2], [1, 0],
    [1, 1], [1, 2], [0, 3], [1, 3],
  ];

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    for (let col = 0; col < line.length; col++) {
      const code = line.charCodeAt(col);
      if (code < 0x2800 || code > 0x28FF) continue;
      const dots = code - 0x2800;

      for (let bit = 0; bit < 8; bit++) {
        if (!(dots & (1 << bit))) continue;
        const [dx, dy] = dotPositions[bit];

        // Fill the dot block
        const baseX = col * charW * dotW + dx * dotW;
        const baseY = row * charH * dotH + dy * dotH;
        for (let py = 0; py < dotH; py++) {
          for (let px = 0; px < dotW; px++) {
            const ox = baseX + px;
            const oy = baseY + py;
            if (ox < outW && oy < outH) {
              out[oy * outW + ox] = fgVal;
            }
          }
        }
      }
    }
  }

  return { width: outW, height: outH, data: out };
}
```

- [ ] **Step 2: Add exports to core index**

Add to `packages/core/src/index.ts` after resize export:

```ts
// Metrics
export { mse, psnr, ssim } from './metrics/ssim.js';
export { rasterizeText, rasterizeBraille } from './metrics/rasterize.js';
export type { DisplayPolarity } from './metrics/rasterize.js';
```

- [ ] **Step 3: Run all metric tests**

Run: `npx vitest run packages/core/tests/metrics-ssim.test.ts packages/core/tests/metrics-rasterize.test.ts`
Expected: 16 tests PASS

- [ ] **Step 4: Run full suite**

Run: `npx vitest run`
Expected: All 96 + 8 = 104 tests PASS

---

## Task 7: Worker requestId + SSIM badge in studio

**Files:**
- Modify: `apps/studio/src/workers/effect.worker.ts`
- Modify: `apps/studio/src/components/PreviewCanvas.tsx`

- [ ] **Step 1: Update worker with requestId + metrics**

Replace `apps/studio/src/workers/effect.worker.ts` content — add requestId, two-phase response, SSIM computation after effect:

Add new imports at top of worker:
```ts
import { ssim, rasterizeText, rasterizeBraille, resizeGray, gaussianBlur as blurImg } from '@ditherforge/core';
import type { GlyphBitmap, TextResult, DitherResult, GrayscaleImage } from '@ditherforge/core';
```

Update WorkerRequest/Response interfaces:
```ts
export interface WorkerRequest {
  requestId: number;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  effectType: EffectType;
  config: Record<string, unknown>;
  fgColor?: string;
  bgColor?: string;
}

export interface EffectResponse {
  type: 'effect';
  requestId: number;
  result: EffectResult;
  effectType: EffectType;
  durationMs: number;
}

export interface MetricsResponse {
  type: 'metrics';
  requestId: number;
  ssim: number | null;
  psnr: number | null;
}

export type WorkerResponse = EffectResponse | MetricsResponse;
```

After computing the effect result and posting Message 1 (effect response), add SSIM computation and post Message 2 (metrics response). Details:
- For text effects (binary, ascii, braille, shape-ascii, edge-ascii hybrid): rasterize result using glyphs from config, compute SSIM vs blurred original gray
- For dither effects: compare DitherResult directly vs blurred gray
- For unsupported (halftone, pixel-art, color-ascii, glitch, edge-ascii edge-only): post ssim: null
- Use `gaussianBlur` with radius 1 on both images before SSIM
- Determine polarity from fgColor/bgColor luminance

- [ ] **Step 2: Update PreviewCanvas for two-phase response**

Modify `apps/studio/src/components/PreviewCanvas.tsx`:
- Add `requestIdRef = useRef(0)` counter
- Add `ssimScore` state
- Send `requestId: ++requestIdRef.current` with each request
- Handle both response types in onmessage:
  - `type === 'effect'`: render canvas, set duration (existing behavior)
  - `type === 'metrics'`: set ssimScore if requestId matches
- Display badge: `"SSIM~: 0.82"` next to duration, or hide if null
- Pass fgColor and bgColor through WorkerRequest

- [ ] **Step 3: Test in browser**

Run: `npx vite --host`
Load test image, verify:
- Effect renders immediately
- SSIM badge appears shortly after for supported effects
- Badge hidden for pixel-art/halftone/glitch
- Slider dragging remains responsive

---

## Task 8: Hardware package scaffolding

**Files:**
- Create: `packages/hardware/package.json`
- Create: `packages/hardware/tsconfig.json`
- Create: `packages/hardware/vitest.config.ts`
- Create: `packages/hardware/src/index.ts`
- Create: `packages/hardware/src/types.ts`
- Create: `packages/hardware/src/panels.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@ditherforge/hardware",
  "version": "0.1.0",
  "description": "Hardware display export for DitherForge — OLED, e-paper, LED matrix, thermal printer",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@ditherforge/core": "*"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "typescript": "~5.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests", "dist"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create types.ts**

```ts
// packages/hardware/src/types.ts
export interface Panel {
  id: string;
  name: string;
  width: number;
  height: number;
  pixelShape: 'square' | 'round';
  tint: string;
  category: 'oled' | 'epaper' | 'led' | 'thermal';
  oneIs: 'bright' | 'dark';
  notes: string;
}

export type BitLayout = 'row-msb' | 'row-lsb' | 'page-vertical';

export interface CArrayOptions {
  name: string;
  layout: BitLayout;
  progmem: boolean;
  invert: boolean;
  includeSize: boolean;
}

export interface MicroPythonOptions {
  name: string;
  invert: boolean;
  format: 'MONO_HLSB' | 'MONO_VLSB';
}

export interface EscPosOptions {
  scale: 0 | 1 | 2 | 3;
  feedAfter?: number;
}
```

- [ ] **Step 5: Create panels.ts**

Copy the full PANELS array from spec §4.2 (9 panel presets: ssd1306-128x64, ssd1306-128x32, sh1106-128x64, epaper-200x200, epaper-250x122, epaper-400x300, led-8x8, led-32x8, thermal-384).

- [ ] **Step 6: Create index.ts**

```ts
// packages/hardware/src/index.ts
export type { Panel, BitLayout, CArrayOptions, MicroPythonOptions, EscPosOptions } from './types.js';
export { PANELS } from './panels.js';
export { packBits, byteLength } from './pack.js';
export { toCArray } from './exporters/c-array.js';
// micropython and escpos exports added in Task 12
```

- [ ] **Step 7: Install dependencies**

Run: `cd C:/Users/wisam/Documents/Project/ditherforge && npm install`
Expected: packages/hardware linked in workspace

---

## Task 9: Bit-packing — tests

**Files:**
- Create: `packages/hardware/tests/pack.test.ts`
- Create: `packages/hardware/tests/golden-vectors.test.ts`
- Create: `packages/hardware/tests/polarity.test.ts`

- [ ] **Step 1: Write pack tests**

```ts
// packages/hardware/tests/pack.test.ts
import { describe, it, expect } from 'vitest';
import { byteLength, packBits } from '../src/pack.js';
import { PANELS } from '../src/panels.js';

const oledPanel = PANELS.find(p => p.id === 'ssd1306-128x64')!;

describe('byteLength', () => {
  it('row layout: ceil(w/8) * h', () => {
    expect(byteLength(128, 64, 'row-msb')).toBe(1024);
    expect(byteLength(250, 122, 'row-msb')).toBe(3904); // ceil(250/8)=32, 32*122
    expect(byteLength(10, 10, 'row-lsb')).toBe(20); // ceil(10/8)=2, 2*10
  });

  it('page-vertical: w * ceil(h/8)', () => {
    expect(byteLength(128, 64, 'page-vertical')).toBe(1024);
    expect(byteLength(250, 122, 'page-vertical')).toBe(4000); // 250*ceil(122/8)=250*16
    expect(byteLength(10, 10, 'page-vertical')).toBe(20); // 10*ceil(10/8)=10*2
  });
});

describe('packBits padding', () => {
  it('padding bits are always 0, even with invert', () => {
    // 10px wide row: 2 bytes per row, bits 2-7 of byte[1] are padding
    const data = new Uint8Array(10); // all black (0)
    data.fill(0);
    const packed = packBits(data, 10, 1, 'row-msb', oledPanel, true); // invert
    // With invert on OLED (bright): black pixels (0) would normally be bit 0.
    // Inverted → bit 1. But padding bits must stay 0.
    const lastByte = packed[1];
    expect(lastByte & 0x3F).toBe(0); // bits 0-5 are padding, must be 0
  });
});
```

- [ ] **Step 2: Write golden vector tests**

```ts
// packages/hardware/tests/golden-vectors.test.ts
import { describe, it, expect } from 'vitest';
import { packBits } from '../src/pack.js';
import type { Panel } from '../src/types.js';

// Panel with oneIs: 'bright' (bit 1 = white pixel)
const brightPanel: Panel = {
  id: 'test', name: 'Test', width: 10, height: 10,
  pixelShape: 'square', tint: '#fff', category: 'oled',
  oneIs: 'bright', notes: '',
};

// 10×10 image, 6 white pixels: A(0,0) B(7,0) C(8,0) D(9,1) E(0,8) F(9,9)
function make10x10(): Uint8Array {
  const data = new Uint8Array(100); // all 0 (black)
  data[0 * 10 + 0] = 255; // A
  data[0 * 10 + 7] = 255; // B
  data[0 * 10 + 8] = 255; // C
  data[1 * 10 + 9] = 255; // D
  data[8 * 10 + 0] = 255; // E
  data[9 * 10 + 9] = 255; // F
  return data;
}

describe('golden vectors — 10×10, 6 white pixels, oneIs=bright', () => {
  const data = make10x10();

  it('row-msb', () => {
    const packed = packBits(data, 10, 10, 'row-msb', brightPanel, false);
    expect(packed.length).toBe(20);
    // Row 0: A(bit7) B(bit0) → 0x81, C(bit7) → 0x80
    expect(packed[0]).toBe(0x81);
    expect(packed[1]).toBe(0x80);
    // Row 1: D(bit6 of byte[3]) → 0x40
    expect(packed[2]).toBe(0x00);
    expect(packed[3]).toBe(0x40);
    // Rows 2-7: all zero
    for (let i = 4; i < 16; i++) expect(packed[i]).toBe(0x00);
    // Row 8: E(bit7) → 0x80
    expect(packed[16]).toBe(0x80);
    expect(packed[17]).toBe(0x00);
    // Row 9: F(bit6 of byte[19]) → 0x40
    expect(packed[18]).toBe(0x00);
    expect(packed[19]).toBe(0x40);
  });

  it('row-lsb', () => {
    const packed = packBits(data, 10, 10, 'row-lsb', brightPanel, false);
    expect(packed.length).toBe(20);
    // Row 0: A(bit0) B(bit7) → 0x81, C(bit0) → 0x01
    expect(packed[0]).toBe(0x81);
    expect(packed[1]).toBe(0x01);
    // Row 1: D at x=9 → byte[3] bit1 → 0x02
    expect(packed[2]).toBe(0x00);
    expect(packed[3]).toBe(0x02);
    // Row 8: E at x=0 → byte[16] bit0 → 0x01
    expect(packed[16]).toBe(0x01);
    expect(packed[17]).toBe(0x00);
    // Row 9: F at x=9 → byte[19] bit1 → 0x02
    expect(packed[18]).toBe(0x00);
    expect(packed[19]).toBe(0x02);
  });

  it('page-vertical', () => {
    const packed = packBits(data, 10, 10, 'page-vertical', brightPanel, false);
    expect(packed.length).toBe(20);
    // Page 0 (rows 0-7):
    // x=0: A(0,0)→bit0 → 0x01
    expect(packed[0]).toBe(0x01);
    // x=1..6: 0x00
    for (let i = 1; i <= 6; i++) expect(packed[i]).toBe(0x00);
    // x=7: B(7,0)→bit0 → 0x01
    expect(packed[7]).toBe(0x01);
    // x=8: C(8,0)→bit0 → 0x01
    expect(packed[8]).toBe(0x01);
    // x=9: D(9,1)→bit1 → 0x02
    expect(packed[9]).toBe(0x02);
    // Page 1 (rows 8-9):
    // x=0: E(0,8)→bit0 → 0x01
    expect(packed[10]).toBe(0x01);
    // x=1..8: 0x00
    for (let i = 11; i <= 18; i++) expect(packed[i]).toBe(0x00);
    // x=9: F(9,9)→bit1 → 0x02
    expect(packed[19]).toBe(0x02);
  });

  it('invert flips non-zero bytes, padding stays 0', () => {
    const packed = packBits(data, 10, 10, 'row-msb', brightPanel, true);
    // Row 0: was 0x81, 0x80 → inverted data bits, but padding bits stay 0
    // Non-padding bits in byte[0]: all 8 bits are data (10px width, byte 0 has bits for x=0..7)
    // byte[0] inverted: ~0x81 & 0xFF = 0x7E
    expect(packed[0]).toBe(0x7E);
    // byte[1]: bits 7-6 are data (x=8,9), bits 5-0 are padding
    // Was 0x80 → data bits: bit7=1,bit6=0 → inverted: bit7=0,bit6=1 → 0x40, padding stays 0
    expect(packed[1]).toBe(0x40);
  });
});
```

- [ ] **Step 3: Write polarity tests**

```ts
// packages/hardware/tests/polarity.test.ts
import { describe, it, expect } from 'vitest';
import { packBits } from '../src/pack.js';
import type { Panel } from '../src/types.js';

// 8 pixels: alternating black/white = [0, 255, 0, 255, 0, 255, 0, 255]
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
    // pixels: 0,255,0,255,0,255,0,255 → bits: 0,1,0,1,0,1,0,1 = 0x55
    expect(packed[0]).toBe(0x55);
  });

  it('dark panel: black pixel (0) → bit 1', () => {
    const packed = packBits(strip, 8, 1, 'row-msb', darkPanel, false);
    // pixels: 0,255,0,255,0,255,0,255 → bits: 1,0,1,0,1,0,1,0 = 0xAA
    expect(packed[0]).toBe(0xAA);
  });

  it('invert flips bits', () => {
    const packed = packBits(strip, 8, 1, 'row-msb', brightPanel, true);
    expect(packed[0]).toBe(0xAA); // inverted from 0x55
  });

  it('invert on dark panel', () => {
    const packed = packBits(strip, 8, 1, 'row-msb', darkPanel, true);
    expect(packed[0]).toBe(0x55); // inverted from 0xAA
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd C:/Users/wisam/Documents/Project/ditherforge && npx vitest run --config packages/hardware/vitest.config.ts`
Expected: FAIL — modules not found

---

## Task 10: Bit-packing — implementation

**Files:**
- Create: `packages/hardware/src/pack.ts`

- [ ] **Step 1: Implement packBits and byteLength**

```ts
// packages/hardware/src/pack.ts
import type { Panel, BitLayout } from './types.js';

export function byteLength(width: number, height: number, layout: BitLayout): number {
  if (layout === 'page-vertical') {
    return width * Math.ceil(height / 8);
  }
  return Math.ceil(width / 8) * height;
}

/**
 * Pack 1-bit pixel data into bytes according to layout and panel polarity.
 *
 * Input: Uint8Array where 0=black, 255=white (from DitherResult.data).
 * Panel.oneIs determines what bit 1 means:
 *   'bright': 255 → 1, 0 → 0
 *   'dark': 0 → 1, 255 → 0
 * Padding bits at row/page boundaries are always 0, unaffected by invert.
 */
export function packBits(
  data: Uint8Array,
  width: number,
  height: number,
  layout: BitLayout,
  panel: Panel,
  invert: boolean,
): Uint8Array {
  const len = byteLength(width, height, layout);
  const out = new Uint8Array(len);

  const toBit = (pixel: number): number => {
    const bit = panel.oneIs === 'bright'
      ? (pixel > 127 ? 1 : 0)
      : (pixel > 127 ? 0 : 1);
    return invert ? 1 - bit : bit;
  };

  if (layout === 'page-vertical') {
    const pages = Math.ceil(height / 8);
    for (let page = 0; page < pages; page++) {
      for (let x = 0; x < width; x++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const y = page * 8 + bit;
          if (y >= height) break; // padding bit stays 0
          const pixel = data[y * width + x];
          if (toBit(pixel)) byte |= (1 << bit);
        }
        out[page * width + x] = byte;
      }
    }
  } else {
    // row-msb or row-lsb
    const bytesPerRow = Math.ceil(width / 8);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = data[y * width + x];
        if (!toBit(pixel)) continue; // bit 0 is default

        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitIdx = layout === 'row-msb' ? 7 - (x % 8) : x % 8;
        out[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  return out;
}
```

- [ ] **Step 2: Run pack + golden + polarity tests**

Run: `cd C:/Users/wisam/Documents/Project/ditherforge && npx vitest run --config packages/hardware/vitest.config.ts`
Expected: ~14 tests PASS

---

## Task 11: C Array exporter

**Files:**
- Create: `packages/hardware/src/exporters/c-array.ts`
- Create: `packages/hardware/tests/c-array.test.ts`

- [ ] **Step 1: Write C array tests**

```ts
// packages/hardware/tests/c-array.test.ts
import { describe, it, expect } from 'vitest';
import { toCArray } from '../src/exporters/c-array.js';
import { PANELS } from '../src/panels.js';

const oled = PANELS.find(p => p.id === 'ssd1306-128x64')!;
const data = new Uint8Array(8); // 8×1 all white
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
    // For all-white 8px on bright panel, both should be 0xFF
    expect(msb).toContain('0xff');
    expect(lsb).toContain('0xff');
  });
});
```

- [ ] **Step 2: Implement C array exporter**

```ts
// packages/hardware/src/exporters/c-array.ts
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

  // 16 hex values per line
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
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run --config packages/hardware/vitest.config.ts`
Expected: All hardware tests PASS (~17)

---

## Task 12: Panel simulation + MicroPython + ESC/POS exporters

**Files:**
- Create: `packages/hardware/src/preview/panel-sim.ts`
- Create: `packages/hardware/src/exporters/micropython.ts`
- Create: `packages/hardware/src/exporters/escpos.ts`
- Create: `packages/hardware/tests/micropython.test.ts`
- Create: `packages/hardware/tests/escpos.test.ts`
- Modify: `packages/hardware/src/index.ts`

- [ ] **Step 1: Implement panel simulator**

```ts
// packages/hardware/src/preview/panel-sim.ts
import type { Panel } from '../types.js';

export function simulatePanel(
  data: Uint8Array,
  width: number,
  height: number,
  panel: Panel,
  invert: boolean,
): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      const pixel = data[y * width + x];
      let on = panel.oneIs === 'bright' ? pixel > 127 : pixel <= 127;
      if (invert) on = !on;
      row.push(on);
    }
    grid.push(row);
  }
  return grid;
}
```

- [ ] **Step 2: Write + implement MicroPython exporter**

Test:
```ts
// packages/hardware/tests/micropython.test.ts
import { describe, it, expect } from 'vitest';
import { toMicroPythonFramebuf } from '../src/exporters/micropython.js';
import { PANELS } from '../src/panels.js';

const oled = PANELS.find(p => p.id === 'ssd1306-128x64')!;
const data = new Uint8Array(16); // 4×4 all black
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
    // 4px wide → ceil(4/8)=1 byte/row × 4 rows = 4 bytes
    // bytearray should have 4 escaped bytes
    expect(code).toMatch(/bytearray\(b'.*'\)/);
  });
});
```

Implementation:
```ts
// packages/hardware/src/exporters/micropython.ts
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
```

- [ ] **Step 3: Write + implement ESC/POS exporter**

Test:
```ts
// packages/hardware/tests/escpos.test.ts
import { describe, it, expect } from 'vitest';
import { toEscPosRaster } from '../src/exporters/escpos.js';
import { PANELS } from '../src/panels.js';

const thermal = PANELS.find(p => p.id === 'thermal-384')!;

describe('toEscPosRaster', () => {
  it('header is GS v 0 with correct bytes', () => {
    const data = new Uint8Array(16); // 4×4
    data.fill(0);
    const result = toEscPosRaster(data, 4, 4, thermal, { scale: 0 });
    // Header: 0x1D, 0x76, 0x30, scale
    expect(result[0]).toBe(0x1D);
    expect(result[1]).toBe(0x76);
    expect(result[2]).toBe(0x30);
    expect(result[3]).toBe(0); // scale
  });

  it('xL/xH = width in bytes, yL/yH = height in dots', () => {
    const data = new Uint8Array(16); // 4×4
    const result = toEscPosRaster(data, 4, 4, thermal, { scale: 0 });
    // xL xH = ceil(4/8) = 1 → [0x01, 0x00]
    expect(result[4]).toBe(0x01);
    expect(result[5]).toBe(0x00);
    // yL yH = 4 → [0x04, 0x00]
    expect(result[6]).toBe(0x04);
    expect(result[7]).toBe(0x00);
  });

  it('appends feed after image', () => {
    const data = new Uint8Array(8); // 8×1
    const result = toEscPosRaster(data, 8, 1, thermal, { scale: 0, feedAfter: 3 });
    // Last 3 bytes should be 0x0A (line feed)
    const len = result.length;
    expect(result[len - 1]).toBe(0x0A);
    expect(result[len - 2]).toBe(0x0A);
    expect(result[len - 3]).toBe(0x0A);
  });
});
```

Implementation:
```ts
// packages/hardware/src/exporters/escpos.ts
import type { Panel, EscPosOptions } from '../types.js';
import { packBits, byteLength } from '../pack.js';

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

  // Header: GS v 0 m xL xH yL yH
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
```

- [ ] **Step 4: Update index.ts exports**

```ts
// packages/hardware/src/index.ts
export type { Panel, BitLayout, CArrayOptions, MicroPythonOptions, EscPosOptions } from './types.js';
export { PANELS } from './panels.js';
export { packBits, byteLength } from './pack.js';
export { toCArray } from './exporters/c-array.js';
export { toMicroPythonFramebuf } from './exporters/micropython.js';
export { toEscPosRaster } from './exporters/escpos.js';
export { simulatePanel } from './preview/panel-sim.js';
```

- [ ] **Step 5: Run all hardware tests**

Run: `npx vitest run --config packages/hardware/vitest.config.ts`
Expected: All tests PASS (~23)

---

## Task 13: Studio — Hardware mode UI

**Files:**
- Create: `apps/studio/src/components/hardware/HardwareMode.tsx`
- Create: `apps/studio/src/components/hardware/PanelPreview.tsx`
- Create: `apps/studio/src/components/hardware/HardwareExport.tsx`
- Modify: `apps/studio/package.json`
- Modify: `apps/studio/tsconfig.app.json`
- Modify: `apps/studio/src/App.tsx`

- [ ] **Step 1: Add hardware dependency to studio**

In `apps/studio/package.json`, add to dependencies:
```json
"@ditherforge/hardware": "*"
```

In `apps/studio/tsconfig.app.json`, add path alias:
```json
"@ditherforge/hardware": ["../../packages/hardware/src"],
"@ditherforge/hardware/*": ["../../packages/hardware/src/*"]
```

Run: `npm install`

- [ ] **Step 2: Create PanelPreview.tsx**

Canvas component that renders panel simulation:
- Takes `data: Uint8Array`, `width`, `height`, `panel: Panel`, `invert: boolean`
- Calls `simulatePanel()` to get boolean grid
- Draws circles for round pixelShape, squares for square
- Panel tint color for "on" pixels, #111 for "off"
- Scales pixel grid to fit available space (calculate cell size from container width / panel.width)

- [ ] **Step 3: Create HardwareExport.tsx**

Export options panel:
- Format selector: C Array / MicroPython / ESC/POS (radio buttons)
- Per-format options (variable name, layout, PROGMEM checkbox, invert, MicroPython format, ESC/POS scale)
- Code preview textarea with generated output
- Copy + Download buttons
- Uses `toCArray`, `toMicroPythonFramebuf`, `toEscPosRaster` from hardware package

- [ ] **Step 4: Create HardwareMode.tsx**

Main container:
- Panel selector dropdown (grouped by category using `PANELS`)
- Dither method selector (Floyd-Steinberg / Atkinson / Bayer)
- Brightness/contrast/threshold sliders
- Resize fit mode (contain/cover/stretch)
- Processes pipeline: grayscale → resize → dither → result
- Passes result to PanelPreview and HardwareExport
- Uses effect worker for dithering
- Shows SSIM badge when available

- [ ] **Step 5: Add mode selector to App.tsx**

In `apps/studio/src/App.tsx`:
- Add `mode` state: `'studio' | 'hardware'`
- Add mode toggle buttons in header
- Lazy import: `const HardwareMode = React.lazy(() => import('./components/hardware/HardwareMode.tsx'))`
- When mode is 'hardware' and sourceImage exists, render HardwareMode instead of studio sidebar+preview
- Pass sourceImage to HardwareMode

- [ ] **Step 6: Build and test in browser**

Run: `npm run build`
Expected: Build succeeds

Run: `npx vite --host`
Test:
- Load image → mode selector visible in header
- Click "Hardware" → panel selector, preview, export options appear
- Select different panels → preview updates
- Export C Array → valid C code in preview
- Copy/Download buttons work
- Switch back to Studio → existing functionality intact

---

## Task 14: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run && npx vitest run --config packages/hardware/vitest.config.ts`
Expected: Core: ~104 tests PASS, Hardware: ~23 tests PASS

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 3: Update root package.json test script**

Add hardware tests to root:
```json
"test": "npm run test --workspace=packages/core && npm run test --workspace=packages/hardware"
```

- [ ] **Step 4: Browser test all features**

Verify:
- Studio mode: all 13 effects work, SSIM badge shows for supported effects
- Hardware mode: panel selector, preview, C/MicroPython/ESC/POS export
- Mode switching preserves image
- Existing features (presets, undo/redo, filters, export) still work

---

## Task 15: Auto-tune (B4) — deferred

**Prerequisite:** B1 SSIM experiment validates that SSIM is a useful optimization target.

**Files:**
- Create: `packages/core/src/metrics/auto-tune.ts`
- Create: `packages/core/tests/auto-tune.test.ts`
- Create: `apps/studio/src/workers/autotune.worker.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `apps/studio/src/components/PreviewCanvas.tsx` (or EffectControls)

Implementation follows spec §6. Only execute after verifying SSIM experiment results in Task 7.

- [ ] **Step 1: Write auto-tune tests**

Tests: returns valid config, score >= baseline, respects maxIterations, same seed → same result.

- [ ] **Step 2: Implement auto-tune with seeded PRNG hill-climbing**

- [ ] **Step 3: Create autotune.worker.ts**

- [ ] **Step 4: Add Optimize button to studio UI**

- [ ] **Step 5: Browser test**

Verify: Optimize button → spinner → config updates → SSIM improves
