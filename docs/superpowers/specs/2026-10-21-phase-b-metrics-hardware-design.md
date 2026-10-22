# Phase B Design: Metrics + Hardware Export

> Date: 2026-10-21
> Status: Draft (rev 3)
> Ref: ARAH-DAN-MODUL.md (Fase B)

---

## 1. Overview

Phase B adds two capabilities to DitherForge:

1. **Metrics** — quantitative quality scoring (SSIM, PSNR) and automatic parameter optimization
2. **Hardware Export (M4)** — convert dithered images to formats for OLED, e-paper, LED matrix, and thermal printers

Metrics lives inside `packages/core` (cross-cutting). Hardware is a new `packages/hardware` (`@ditherforge/hardware`). Both integrate into studio.

### Implementation phases (within Phase B)

| Sub-phase | Content | Gate |
|-----------|---------|------|
| B0 | `resizeGray` in core + panel polarity model | Resize tests pass |
| B1 | Metrics (SSIM, rasterizers, badge) + SSIM-vs-dither experiment | Badge visible in browser; experiment passes criteria |
| B2 | OLED exporter (C array 3 layouts, raw binary), panel sim, golden vector tests | Tests match hand-computed vectors |
| B3 | MicroPython, ESC/POS exporters | All exporter tests pass |
| B4 | Auto-tune (after B1 proves optimization target is sound) | Optimize button works in browser |

---

## 2. B0: Resize + Polarity Foundations

### 2.1 resizeGray

**File:** `packages/core/src/utils/resize.ts`

```ts
export type ResizeFit = 'contain' | 'cover' | 'stretch';

export function resizeGray(
  img: GrayscaleImage,
  targetW: number,
  targetH: number,
  fit: ResizeFit,
  padValue?: number,  // default 255 (white); use 0 for hardware panels where bright=lit
): GrayscaleImage;
```

- Downscale: area-averaging (sum source pixels per target pixel, divide by count).
- Upscale: bilinear interpolation.
- `contain`: fit inside target, pad remaining with `padValue`. Preserves aspect ratio.
- `cover`: fill target, crop center. Preserves aspect ratio.
- `stretch`: ignore aspect ratio.
- If source matches target, return as-is (no copy).
- `targetH = 0`: compute from aspect ratio (`targetH = round(img.height * targetW / img.width)`).

**Tests** (`tests/resize.test.ts`, ~7):
- 2×2 → 1×1 averages correctly
- contain preserves aspect, pads with specified padValue
- cover crops center
- stretch distorts
- identity (same size) returns same data
- non-divisible dimensions (e.g. 7×5 → 3×3)
- height=0 auto-computes from aspect ratio

**Export:** Add to `packages/core/src/index.ts`.

### 2.2 Panel polarity model

DitherResult uses 0=black, 255=white per pixel. Hardware devices differ on what bit 1 means.

**Model: `oneIs: 'bright' | 'dark'`**

- `'bright'`: bit 1 = bright/lit pixel. Mapping: 255 → 1, 0 → 0. Used by OLED, LED.
- `'dark'`: bit 1 = dark/ink pixel. Mapping: 0 → 1, 255 → 0. Used by thermal printers.

E-paper polarity varies by model and is unverified. Default to `'dark'` (bit 1 = ink/black dot) with note.

**No `defaultInvert` field.** The `invert` checkbox in UI is a simple user toggle that flips all bits AFTER polarity mapping. Export functions:

```ts
function mapPixelToBit(pixel: number, panel: Panel, userInvert: boolean): 0 | 1 {
  const bit = panel.oneIs === 'bright' ? (pixel > 127 ? 1 : 0) : (pixel > 127 ? 0 : 1);
  return userInvert ? (1 - bit) as 0 | 1 : bit;
}
```

**Padding bits** (from row byte alignment) are always 0, unaffected by invert.

There is only ONE invert in hardware pipeline — at the bit-packing level. The `applyAdjustments.invert` (image-level invert) is not exposed separately in hardware mode UI to avoid confusion.

**Panel type:**

```ts
export interface Panel {
  id: string;
  name: string;
  width: number;
  height: number;             // 0 = auto (thermal printer)
  pixelShape: 'square' | 'round';
  tint: string;               // hex for preview
  category: 'oled' | 'epaper' | 'led' | 'thermal';
  oneIs: 'bright' | 'dark';   // bit 1 means this
  notes: string;
}
```

### 2.3 Hardware pipeline (corrected)

```
sourceImage (RGBA)
  → rgbaToGrayscale
  → resizeGray(gray, panelW, panelH, fit, padValue)    ← panelH resolved first
  → dither effect (floyd-steinberg / atkinson / bayer)   ← applies adjustments internally
  → DitherResult (at panel resolution)
  → exporter (applies polarity mapping + packing)
```

**Critical fixes:**
1. **No separate `applyAdjustments` call.** Floyd-steinberg, atkinson, and bayer all call `applyAdjustments` internally. Brightness/contrast/invert controls feed into the dither config, not as a separate pipeline step. Double-application was the bug.
2. **Resolve panel height first.** For thermal (height=0): `resolvedH = Math.round(img.height * panel.width / img.width)`.
3. **Pad value from polarity.** `padValue = panel.oneIs === 'bright' ? 0 : 255`. On OLED (bright), padding = 0 = dark = off. On thermal (dark), padding = 255 = white = not printed. Both correct.
4. **No preprocessing filters in hardware mode.** Blur/sharpen/posterize degrade dither quality at small resolutions. Only brightness/contrast/threshold.

---

## 3. B1: Metrics Module

### Location

`packages/core/src/metrics/` — three files:

- `ssim.ts` — MSE, PSNR, SSIM
- `rasterize.ts` — TextResult/braille → GrayscaleImage
- `auto-tune.ts` — parameter search (implemented in B4, types defined here)

### 3.1 SSIM implementation

```ts
export function mse(a: GrayscaleImage, b: GrayscaleImage): number;
export function psnr(a: GrayscaleImage, b: GrayscaleImage): number;  // dB, Infinity for identical
export function ssim(
  a: GrayscaleImage,
  b: GrayscaleImage,
  windowSize?: number,  // default 7, must be odd
): number;  // 0–1
```

**Algorithm:** Uniform sliding window variant (NOT Gaussian 11×11 from Wang 2004). Default window 7×7 (odd, so reference values can be validated against scikit-image with `gaussian_weights=False`). Constants: C1 = (0.01×255)², C2 = (0.03×255)².

Document in code that this is simplified variant.

**Pre-SSIM blur:** Apply light Gaussian blur (radius=1 by default, parameter) to BOTH images before SSIM. This approximates "viewing distance" for dithered output. Radius is a parameter so hardware mode can use smaller/no blur for tiny panels.

**Small image handling:** If image dimension < windowSize × 2, skip SSIM (return `null`). Studio hides badge. This avoids meaningless scores for LED 8×8 etc.

**Tests** (`tests/metrics-ssim.test.ts`, ~8):
- Identical → SSIM = 1.0, PSNR = Infinity
- All-black vs all-white → SSIM < 0.1
- Noise → intermediate (0.1 < SSIM < 0.9)
- Symmetric: ssim(a,b) === ssim(b,a)
- Dimension mismatch → throws
- Known reference value: 32×32 gradient pair → pre-computed expected SSIM ± 0.02 (compute reference with independent Python script, document in test comment)
- MSE of identical = 0
- Image too small for window → returns null

### 3.2 Rasterizer

**Single file** `rasterize.ts` handles both ASCII and braille.

```ts
export type DisplayPolarity = 'light-on-dark' | 'dark-on-light';

export function rasterizeText(
  result: TextResult,
  glyphs: GlyphBitmap[],
  polarity: DisplayPolarity,
): GrayscaleImage;

export function rasterizeBraille(
  result: TextResult,
  polarity: DisplayPolarity,
  dotW?: number,  // pixels per braille dot column, default 2
  dotH?: number,  // pixels per braille dot row, default 4
): GrayscaleImage;
```

**Polarity logic for rasterizeText:**

Glyph bitmaps from `glyph-atlas.ts` are ink-on-white: 0 = ink (character stroke), 255 = background.

- `'light-on-dark'` (e.g. green text on black bg — studio default): Dense character should produce BRIGHT pixels. Invert glyph bitmap: `255 - bitmapValue`. Result: '@' → mostly 255 (bright), ' ' → mostly 0 (dark). Matches how it looks on screen.
- `'dark-on-light'` (e.g. black text on white bg): Dense character produces DARK pixels. Use glyph bitmap as-is. '@' → mostly 0 (dark ink), ' ' → mostly 255 (white paper).

**Polarity is derived from studio colors**, not per-effect table. In `PreviewCanvas`:
```ts
const fgLum = luminance(fgColor);
const bgLum = luminance(bgColor);
const polarity: DisplayPolarity = fgLum > bgLum ? 'light-on-dark' : 'dark-on-light';
```

This eliminates the fragile per-effect polarity table. All effects use same polarity because they all render with same fg/bg colors.

**Braille rasterizer:** Decodes Unicode braille (U+2800–U+28FF) back to 2×4 dot grid. Each dot becomes a block of dotW×dotH pixels. Polarity: dot-on = foreground color → same inversion logic as text.

**Mandatory correlation test:** Synthetic image: left half bright (200), right half dark (50). Run ascii effect, rasterize. Left half of rasterized output MUST have higher mean luminance than right half (positive correlation with source). Same test for binary, shape-ascii, braille. If any fails, polarity is wrong.

**Tests** (`tests/metrics-rasterize.test.ts`, ~8):
- Single char 'A' rasterizes to glyph bitmap dimensions
- Multi-row text: correct total dimensions
- Unknown char → blank (matches polarity: 255 for light-on-dark, 0 for dark-on-light)
- Polarity: light-on-dark and dark-on-light produce inverted outputs
- Braille: known char (e.g. U+2813 = dots 1,2,5) → correct dot pattern
- Braille: empty (U+2800) → all background
- **Correlation test:** half-bright/half-dark image → rasterized output positively correlates (4 effects)

### 3.3 Supported effects for SSIM badge

| Category | Effects | Comparison method |
|----------|---------|-------------------|
| Text | binary, ascii, shape-ascii | rasterizeText → blur → SSIM vs resized+blurred original |
| Braille | braille | rasterizeBraille → blur → SSIM vs resized+blurred original |
| Dither | floyd-steinberg, atkinson, bayer | DitherResult pixels → blur → SSIM vs blurred original |
| Edge | edge-ascii (hybrid mode only) | rasterizeText → blur → SSIM vs blurred original |
| **Excluded** | edge-ascii (edge-only mode), halftone, pixel-art, color-ascii, glitch | No badge — output format incompatible or comparison conceptually wrong |

**edge-ascii edge-only mode:** Comparing edge lines against luminance is conceptually wrong (edges are derivatives, not values). Excluded from badge and auto-tune. Hybrid mode includes luminance fill, so it's viable.

### 3.4 Studio metrics integration

**Two-phase worker response** (latency fix):

Effect worker sends result in two messages for same request:
```ts
// Message 1: immediate — unblocks UI
interface EffectResponse {
  type: 'effect';
  requestId: number;
  result: EffectResult;
  effectType: EffectType;
  durationMs: number;
}

// Message 2: follows shortly — updates badge
interface MetricsResponse {
  type: 'metrics';
  requestId: number;
  ssim: number | null;   // null if unsupported or image too small
  psnr: number | null;
}
```

Worker computes effect first, posts it, then computes metrics and posts second message. `requestId` ties them together. PreviewCanvas renders immediately on Message 1, updates badge on Message 2. Slider dragging stays responsive.

**Display:**
- Badge: `"SSIM~: 0.82"` (tilde = approximate due to blur)
- PSNR as tooltip
- Infinity PSNR → "∞"
- null SSIM → badge hidden
- Compare mode: each side independent

### 3.5 B1 Experiment: SSIM validation

Before building auto-tune, validate that SSIM is useful.

**Procedure:**
1. Pick 5 test images (gradient, portrait, text, high-contrast, low-contrast)
2. For each: run ascii effect with 3 different configs (bad/medium/good — vary contrast+brightness)
3. Compute SSIM for each
4. Manually rank visual quality

**Pass criteria:** SSIM ranking matches visual ranking in ≥ 4 of 5 images, AND dithered output scores higher than blank/noise.

Document results in a test file or markdown. If fails, adjust blur radius or abandon SSIM for text effects.

### 3.6 Exports

Add to `packages/core/src/index.ts`:
```ts
export { mse, psnr, ssim } from './metrics/ssim.js';
export { rasterizeText, rasterizeBraille } from './metrics/rasterize.js';
export type { DisplayPolarity } from './metrics/rasterize.js';
export { resizeGray } from './utils/resize.js';
export type { ResizeFit } from './utils/resize.js';
```

---

## 4. B2–B3: Hardware Module

### Location

`packages/hardware/` (`@ditherforge/hardware`)

### Structure

```
packages/hardware/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── panels.ts
│   ├── pack.ts              ← shared bit-packing + polarity logic
│   ├── exporters/
│   │   ├── c-array.ts
│   │   ├── micropython.ts
│   │   └── escpos.ts
│   └── preview/
│       └── panel-sim.ts
└── tests/
    ├── pack.test.ts
    ├── c-array.test.ts
    ├── micropython.test.ts
    ├── escpos.test.ts
    ├── golden-vectors.test.ts
    └── polarity.test.ts
```

Note: `raw-binary.ts` merged into `pack.ts` since it's the shared foundation all exporters use.

### 4.1 Types

```ts
export interface Panel {
  id: string;
  name: string;
  width: number;
  height: number;             // 0 = auto (thermal printer)
  pixelShape: 'square' | 'round';
  tint: string;
  category: 'oled' | 'epaper' | 'led' | 'thermal';
  oneIs: 'bright' | 'dark';  // what bit 1 means on this device
  notes: string;
}

export type BitLayout = 'row-msb' | 'row-lsb' | 'page-vertical';

export interface CArrayOptions {
  name: string;
  layout: BitLayout;
  progmem: boolean;
  invert: boolean;            // flip from panel's default polarity
  includeSize: boolean;
}

export interface MicroPythonOptions {
  name: string;
  invert: boolean;
  format: 'MONO_HLSB' | 'MONO_VLSB';
}

export interface EscPosOptions {
  scale: 0 | 1 | 2 | 3;     // GS v 0 mode: 0=normal, 1=2x width, 2=2x height, 3=2x both
  feedAfter?: number;         // line feeds after image, default 3
}
```

No `widthDots` in EscPosOptions — uses `panel.width` directly (was duplicate).

### 4.2 Panel Presets

```ts
export const PANELS: Panel[] = [
  {
    id: 'ssd1306-128x64', name: 'OLED SSD1306 128×64',
    width: 128, height: 64, pixelShape: 'round', tint: '#00b4ff',
    category: 'oled', oneIs: 'bright',
    notes: 'Most common Arduino OLED. Native page-vertical layout.',
  },
  {
    id: 'ssd1306-128x32', name: 'OLED SSD1306 128×32',
    width: 128, height: 32, pixelShape: 'round', tint: '#00b4ff',
    category: 'oled', oneIs: 'bright',
    notes: 'Narrow OLED variant.',
  },
  {
    id: 'sh1106-128x64', name: 'OLED SH1106 128×64',
    width: 128, height: 64, pixelShape: 'round', tint: '#00b4ff',
    category: 'oled', oneIs: 'bright',
    notes: 'SH1106: 132-column RAM, many modules use 2px offset. Preview ignores offset.',
  },
  {
    id: 'epaper-200x200', name: 'E-Paper 1.54" 200×200',
    width: 200, height: 200, pixelShape: 'square', tint: '#222222',
    category: 'epaper', oneIs: 'dark',
    notes: 'Waveshare 1.54". Polarity unverified — bit 1 assumed = black dot.',
  },
  {
    id: 'epaper-250x122', name: 'E-Paper 2.13" 250×122',
    width: 250, height: 122, pixelShape: 'square', tint: '#222222',
    category: 'epaper', oneIs: 'dark',
    notes: 'Waveshare 2.13". Native portrait; user must rotate source if needed. Polarity unverified.',
  },
  {
    id: 'epaper-400x300', name: 'E-Paper 4.2" 400×300',
    width: 400, height: 300, pixelShape: 'square', tint: '#222222',
    category: 'epaper', oneIs: 'dark',
    notes: 'Waveshare 4.2". Polarity unverified.',
  },
  {
    id: 'led-8x8', name: 'LED Matrix 8×8',
    width: 8, height: 8, pixelShape: 'round', tint: '#ff0000',
    category: 'led', oneIs: 'bright',
    notes: 'MAX7219. Byte order depends on wiring — preview only, verify on hardware.',
  },
  {
    id: 'led-32x8', name: 'LED Matrix 32×8',
    width: 32, height: 8, pixelShape: 'round', tint: '#ff0000',
    category: 'led', oneIs: 'bright',
    notes: '4× MAX7219 chained. Byte order depends on wiring — preview only.',
  },
  {
    id: 'thermal-384', name: 'Thermal Printer 58mm',
    width: 384, height: 0, pixelShape: 'square', tint: '#444444',
    category: 'thermal', oneIs: 'dark',
    notes: 'ESC/POS GS v 0. Height auto from aspect ratio. Command deprecated by Epson but widely supported.',
  },
];
```

**E-paper rotation:** Deferred from B3. Dimensions in presets are landscape. User rotates source image externally if needed. Documented in notes. Can add rotation transform in future version.

### 4.3 Shared bit-packing (`pack.ts`)

```ts
export function packBits(
  data: Uint8Array,           // 0 or 255 per pixel (DitherResult.data)
  width: number,
  height: number,
  layout: BitLayout,
  panel: Panel,
  invert: boolean,
): Uint8Array;

export function byteLength(width: number, height: number, layout: BitLayout): number;
```

**Byte size formulas:**

```
row-msb / row-lsb:   ceil(width / 8) * height
page-vertical:        width * ceil(height / 8)
```

Padding bits at end of each row/page are always 0, NEVER affected by invert.

### 4.4 Bit layout definitions

**row-msb** (Adafruit drawBitmap):
- Pixel (x,y): byte = `y * ceil(w/8) + floor(x/8)`, bit = `7 - (x % 8)`
- Pixel (0,0) = bit 7 of byte 0. Pixel (7,0) = bit 0 of byte 0.

**row-lsb** (XBM / U8g2):
- Pixel (x,y): byte = `y * ceil(w/8) + floor(x/8)`, bit = `x % 8`
- Pixel (0,0) = bit 0 of byte 0. Pixel (7,0) = bit 7 of byte 0.

**page-vertical** (native SSD1306):
- Page = `floor(y/8)`. Pixel (x,y): byte = `page * width + x`, bit = `y % 8`
- Pixel (0,0) = bit 0 of byte 0. Pixel (0,7) = bit 7 of byte 0. Pixel (0,8) = bit 0 of byte[width].

### 4.5 Golden vectors

**10×10 test pattern**, 6 white pixels at known positions:

```
A(0,0) B(7,0) C(8,0) D(9,1) E(0,8) F(9,9)
```

All other pixels black. Panel with `oneIs: 'bright'`, `invert: false`. Bit 1 = white.

Total bytes per layout:
- row-msb/row-lsb: `ceil(10/8) * 10 = 2 * 10 = 20 bytes`
- page-vertical: `10 * ceil(10/8) = 10 * 2 = 20 bytes`

**row-msb** (bit 7 = leftmost):
```
Row 0: byte[0] = A at bit7, B at bit0 → 0x81; byte[1] = C at bit7 → 0x80
Row 1: byte[0] = 0x00; byte[1] = D at bit6 → 0x40
Rows 2–7: all 0x00
Row 8: byte[0] = E at bit7 → 0x80; byte[1] = 0x00
Row 9: byte[0] = 0x00; byte[1] = F at bit6 → 0x40
```

**row-lsb** (bit 0 = leftmost):
```
Row 0: byte[0] = A at bit0, B at bit7 → 0x81; byte[1] = C at bit0 → 0x01
Row 1: byte[0] = 0x00; byte[1] = D at bit1 → 0x02
Rows 2–7: all 0x00
Row 8: byte[0] = E at bit0 → 0x01; byte[1] = 0x00
Row 9: byte[0] = 0x00; byte[1] = F at bit1 → 0x02
```

**page-vertical** (bit position = y%8, byte = page*width + x):
```
Page 0 (rows 0–7):
  byte[0] (x=0): A(0,0) at bit0 → 0x01
  byte[7] (x=7): B(7,0) at bit0 → 0x01
  byte[8] (x=8): C(8,0) at bit0 → 0x01
  byte[9] (x=9): D(9,1) at bit1 → 0x02
  bytes 1–6: 0x00
Page 1 (rows 8–9, padded to 8):
  byte[10] (x=0): E(0,8) at bit0 → 0x01
  byte[19] (x=9): F(9,9) at bit1 → 0x02
  bytes 11–18: 0x00
```

**Additional vector tests:**
- Same pattern with `invert: true` → all non-zero bytes flipped, but padding bits remain 0
- Padding verification: row 0 byte[1] only has bits 7–6 as data (for 10px width), bits 5–0 must be 0 even with invert

### 4.6 Exporters

**C Array (B2):**

```ts
export function toCArray(
  data: Uint8Array, width: number, height: number,
  panel: Panel, opts: CArrayOptions,
): string;
```

Output format:
```c
#define IMAGE_WIDTH 128
#define IMAGE_HEIGHT 64
const unsigned char PROGMEM image_data[] = {
  0xff, 0x00, 0x3c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  // ... 16 values per line
};
```

**MicroPython (B3):**

```ts
export function toMicroPythonFramebuf(
  data: Uint8Array, width: number, height: number,
  panel: Panel, opts: MicroPythonOptions,
): string;
```

Output:
```python
import framebuf

image_data = bytearray(b'\xff\x00\x3c...')
fb = framebuf.FrameBuffer(image_data, 128, 64, framebuf.MONO_HLSB)
```

MONO_HLSB = horizontal, MSB left (= row-msb). MONO_VLSB = vertical, LSB top (= page-vertical). Both per MicroPython docs.

**ESC/POS (B3):**

```ts
export function toEscPosRaster(
  data: Uint8Array, width: number, height: number,
  panel: Panel, opts: EscPosOptions,
): Uint8Array;
```

Command: `[0x1D, 0x76, 0x30, scale, xL, xH, yL, yH, ...data]`
- `xL, xH`: width in bytes = `ceil(widthDots / 8)`, little-endian
- `yL, yH`: height in dots, little-endian
- Data: row-msb packed, one row = `ceil(widthDots/8)` bytes
- Appends `feedAfter` line feeds (0x0A) after image data

### 4.7 Tests summary

**`pack.test.ts`** (~4):
- byteLength: row formula ceil(w/8)*h, page formula w*ceil(h/8)
- Non-multiple-of-8: 250×122 → 3904 bytes (row), 4000 bytes (page)
- Padding bits always 0

**`golden-vectors.test.ts`** (~6):
- 10×10 pattern, row-msb: exact bytes match §4.5
- 10×10 pattern, row-lsb: exact bytes match §4.5
- 10×10 pattern, page-vertical: exact bytes match §4.5
- Invert: non-zero bytes flipped, padding still 0
- Compare row-msb vs row-lsb: byte[0] of row 0 differs (0x81 vs 0x81 same! but byte[1] differs: 0x80 vs 0x01)

**`polarity.test.ts`** (~4):
- OLED (bright): white pixel (255) → bit 1
- Thermal (dark): black pixel (0) → bit 1
- Invert flag flips both
- 8-pixel strip: known input → known byte for each polarity

**`c-array.test.ts`** (~3): PROGMEM, #define, 3 layouts produce different output
**`micropython.test.ts`** (~3): valid Python, HLSB vs VLSB, bytearray length
**`escpos.test.ts`** (~3): header [0x1D,0x76,0x30,scale], xL/xH = bytes, feed appended

### 4.8 Preview

```ts
export function simulatePanel(
  data: Uint8Array,
  width: number,
  height: number,
  panel: Panel,
  invert: boolean,
): boolean[][];  // [y][x] = true if pixel should appear "on" (drawn with tint)
```

Uses same polarity logic as exporters. `true` = draw with panel tint color.

---

## 5. Studio Integration

### 5.1 Mode Selector

Header toggle: **Studio** | **Hardware**. Hardware lazy-loaded via `React.lazy`.

Hardware mode shares `sourceImage` from StudioState. Same image, different pipeline.

### 5.2 Worker protocol

**Effect worker** (`effect.worker.ts`):
- Existing effect messages get `requestId: number` field
- After posting effect result (Message 1), worker computes SSIM and posts metrics (Message 2)
- Both messages carry same `requestId`
- PreviewCanvas uses `requestId` to match metrics to correct render
- UI renders canvas on Message 1 (responsive), updates badge on Message 2

**Auto-tune worker** (`autotune.worker.ts`, new, B4):
- Separate worker — long-running, doesn't block effect rendering
- Posts progress updates
- Terminated via `worker.terminate()` + recreate for cancellation (AbortSignal can't be posted)

### 5.3 Hardware Mode Components

`apps/studio/src/components/hardware/`:

1. **HardwareMode.tsx** — main container
   - Panel selector dropdown (grouped by category)
   - Dither method selector (Floyd-Steinberg / Atkinson / Bayer)
   - Brightness/contrast/threshold sliders (NO separate invert — only at bit level)
   - Resize fit mode (contain/cover/stretch)
   - SSIM badge (hidden for panels < 16px)

2. **PanelPreview.tsx** — canvas rendering
   - Pixel grid at panel dimensions
   - Circle (OLED/LED) or square (e-paper/thermal) per pixelShape
   - Tint color for "on" pixels, #111 for "off"
   - Scales to fit viewport, maintains aspect

3. **HardwareExport.tsx** — export options + code output
   - Format selector: C Array / MicroPython / ESC/POS
   - Per-format options
   - Code preview
   - Copy + Download buttons

### 5.4 Modified files

- `apps/studio/package.json` — add `@ditherforge/hardware` dependency
- `apps/studio/src/App.tsx` — mode selector, lazy import HardwareMode
- `apps/studio/src/workers/effect.worker.ts` — add requestId, SSIM computation after effect
- `apps/studio/src/components/PreviewCanvas.tsx` — handle two-phase response, show badge

---

## 6. B4: Auto-tune

Deferred until B1 experiment validates SSIM as optimization target.

```ts
export interface AutoTuneConstraints {
  cols: number;               // FIXED — not tuned
  maxIterations?: number;     // default 50
  timeBudgetMs?: number;      // default 3000, whichever hits first
  effectType: EffectType;
  seed: number;               // required — mulberry32 PRNG
}

export interface AutoTuneResult {
  bestConfig: Record<string, unknown>;
  bestScore: number;
  iterations: number;
  durationMs: number;
}
```

**Key decisions:**
- `cols` fixed (SSIM monotonically improves with more columns — tuning is useless)
- Seeded PRNG for reproducibility
- Runs on downscaled image (resizeGray to max 256px wide) for speed
- Cancellation: `worker.terminate()` + recreate

**Supported effects:**

| Effect | Tuned params |
|--------|-------------|
| binary, braille | threshold, contrast, brightness |
| ascii | contrast, brightness |
| floyd-steinberg, atkinson | threshold, contrast, brightness |
| bayer | matrixSize, contrast, brightness |
| shape-ascii | contrast, brightness |
| edge-ascii (hybrid only) | edgeThreshold, contrast, brightness |

Excluded: halftone (no SSIM rasterizer), pixel-art, color-ascii, glitch, edge-ascii edge-only.

**Tests** (`tests/auto-tune.test.ts`, ~4):
- Returns valid config with expected keys for given effectType
- Score >= baseline default config (synthetic gradient, deterministic with fixed seed)
- Respects maxIterations
- Same seed → same result

---

## 7. Files Summary

| Area | New Files | Modified Files | Tests |
|------|-----------|----------------|-------|
| B0: resize | 1 | 1 (core/index.ts) | ~7 |
| B1: metrics core | 2 (ssim.ts, rasterize.ts) | 1 (core/index.ts) | ~16 |
| B1: studio metrics | 0 | 2 (worker, PreviewCanvas) | 0 |
| B2: hardware pkg | 5 (pkg.json, tsconfig, vitest, index, types) | 1 (root pkg.json) | 0 |
| B2: panels + pack | 2 (panels.ts, pack.ts) | 0 | ~14 (pack, golden, polarity) |
| B2: C array exporter | 1 | 0 | ~3 |
| B3: micropython + escpos | 2 | 0 | ~6 |
| B3-B4: studio hardware | 4 (HardwareMode, PanelPreview, HardwareExport, autotune.worker) | 3 (App, studio pkg.json, worker) | 0 |
| B4: auto-tune | 1 | 1 (core/index.ts) | ~4 |
| **Total** | **~18 new** | **~9 modified** | **~50** |

---

## 8. Unverified Claims

- [ ] E-paper polarity (assumed `'dark'` = bit 1 = black dot)
- [ ] SH1106 2px column offset
- [ ] LED MAX7219 byte order (wiring-dependent)
- [ ] ESC/POS GS v 0 cross-printer compat
- [ ] MicroPython SSD1306 driver uses MONO_VLSB

Studio shows warning badge on panels with unverified polarity.
