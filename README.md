<div align="center">

<img src="docs/logo.jpeg" alt="Maxither" width="200" style="border-radius: 16px;" />

# Maxither

**Image effects studio for the modern web**

Turn any image into ASCII art, dithered graphics, pixel art, halftone, glitch effects, and hardware display output - right in your browser.

[![Live Demo](https://img.shields.io/badge/demo-maxither--one.vercel.app-00ff41?style=flat-square)](https://maxither-one.vercel.app/)
[![HuggingFace API](https://img.shields.io/badge/API-HuggingFace%20Spaces-FFD21E?style=flat-square&logo=huggingface)](https://huggingface.co/spaces/wisamWR/maxither-api)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![npm](https://img.shields.io/npm/v/@ditherforge/core?style=flat-square&color=00ff41)](https://www.npmjs.com/package/@ditherforge/core)

</div>

---

## Features

### 13 Image Effects

| Category     | Effects                                                           |
| ------------ | ----------------------------------------------------------------- |
| **Text**     | ASCII, Binary (0/1), Braille (Unicode 2x4 dots)                   |
| **Dither**   | Floyd-Steinberg, Atkinson, Bayer (2x2 / 4x4 / 8x8)                |
| **Dots**     | Halftone (variable-radius dot grid)                               |
| **Color**    | Pixel Art (multi-palette quantization)                            |
| **Advanced** | Shape Match (NCC glyph fitting), Edge Detect (Sobel), Color ASCII |
| **FX**       | Glitch (RGB split, scanlines, noise, seed control)                |

### Studio

- **Image input** - drag & drop, paste, file picker, webcam (single + live mode)
- **Real-time preview** - Web Worker processing with 50ms debounce
- **Adjustments** - brightness, contrast, invert per effect
- **Pre-processing filters** - blur, sharpen, posterize
- **Color** - foreground/background picker, transparent background, palette selector
- **Compare mode** - side-by-side original vs processed
- **Presets** - 8 built-in + custom save/load (localStorage)
- **Undo/Redo** - Ctrl+Z / Ctrl+Y
- **Share** - URL-encoded settings for sharing configurations

### Export

| Format        | Types                                                                 |
| ------------- | --------------------------------------------------------------------- |
| **Image**     | PNG, SVG                                                              |
| **Text**      | TXT, ANSI (truecolor / 256 / 16 color)                                |
| **Animation** | Animated SVG (reveal, scanline, flicker, matrix), WebM recording, GIF |
| **Code**      | React component, Web Component, HTML snippet                          |
| **Embed**     | README badge via HuggingFace API                                      |

### Hardware Display Export

Export dithered output for embedded displays:

- **9 panel presets** - SSD1306, SH1106 (OLED), E-Paper, MAX7219 (LED), Thermal
- **3 bit layouts** - row-msb, row-lsb, page-vertical
- **Export formats** - C Array (PROGMEM), MicroPython framebuf, ESC/POS raster
- **Panel preview** - canvas simulation with round/square pixel shapes and tint colors

### Quality Metrics

- **SSIM** (Structural Similarity Index) - 7x7 uniform window
- **PSNR** (Peak Signal-to-Noise Ratio)
- Async two-phase worker: effect renders immediately, SSIM badge updates in background

---

## Quick Start

### Use Online

Visit **[maxither-one.vercel.app](https://maxither-one.vercel.app/)** - no install needed. Drop an image or use the loaded example to start.

### Self-Host

```bash
git clone https://github.com/wisamWR/Maxither-dither_fx_studio.git
cd ditherforge
npm install
npm run dev
```

Open http://localhost:5173

### Use as Library

```bash
npm install @ditherforge/core
```

```typescript
import { asciiEffect, rgbaToGrayscale } from "@ditherforge/core";

const gray = rgbaToGrayscale(rgbaData, width, height);
const result = asciiEffect(gray, {
  cols: 80,
  charset: " .:-=+*#%@",
  brightness: 0,
  contrast: 0,
  invert: false,
});
console.log(result.text);
```

### HuggingFace API

Generate ASCII art SVGs via HTTP - perfect for GitHub README embeds.

```
https://huggingface.co/spaces/wisamWR/maxither-api
```

**Endpoints:**

| Endpoint      | Description             |
| ------------- | ----------------------- |
| `/api/text`   | Text-to-ASCII art SVG   |
| `/api/avatar` | Image-to-ASCII avatar   |
| `/api/banner` | ASCII banner generation |

**Example:**

```
https://wisamwr-maxither-api.hf.space/api/text?text=Hello&style=ascii&color=00ff41
```

---

## Tech Stack

| Layer               | Technology                                    |
| ------------------- | --------------------------------------------- |
| **Core Engine**     | TypeScript, zero dependencies, tree-shakeable |
| **Hardware Module** | TypeScript, bit-packing, polarity model       |
| **Studio UI**       | React 18, Vite 6, Tailwind CSS v4             |
| **Processing**      | Web Workers, Canvas API                       |
| **API**             | Python, Gradio, HuggingFace Spaces            |
| **Tests**           | Vitest - 134 tests (114 core + 20 hardware)   |
| **Deploy**          | Vercel                                        |

---

## Project Structure

```
maxither/
├── packages/
│   ├── core/                # @ditherforge/core - pure-function effects engine
│   │   ├── src/
│   │   │   ├── effects/     # 13 effect implementations
│   │   │   ├── metrics/     # SSIM, PSNR, rasterizers
│   │   │   ├── utils/       # resize, filters, edge-detect, palettes
│   │   │   ├── export/      # SVG builder, ANSI export
│   │   │   └── svg/         # SVG templates, animated SVG
│   │   └── tests/           # 114 tests
│   └── hardware/            # @ditherforge/hardware - display export
│       ├── src/
│       │   ├── exporters/   # C array, MicroPython, ESC/POS
│       │   └── preview/     # Panel simulation
│       └── tests/           # 20 tests
└── apps/
    └── studio/              # React SPA
        └── src/
            ├── components/  # UI panels
            │   └── hardware/# Hardware mode (lazy-loaded, 5.3KB)
            ├── workers/     # Effect + metrics workers
            └── lib/         # Export, presets, history, URL state
```

---

## Build & Test

```bash
# Development
npm run dev              # Vite HMR on localhost:5173

# Build
npm run build            # ~903ms, ~207KB JS (64KB gzip)

# Test
npm test                 # 134 tests, ~4s
```

---

## License

[MIT](LICENSE) - built by [@wisamWR](https://github.com/wisamWR)
