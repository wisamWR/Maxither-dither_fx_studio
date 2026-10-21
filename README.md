<div align="center">

# DitherForge

**The ASCII art studio for the modern web**

Turn any image into ASCII art, dithered graphics, pixel art, glitch effects, and more — right in your browser.

[![Live Demo](https://img.shields.io/badge/demo-ditherforge.vercel.app-00ff41?style=flat-square)](https://ditherforge.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![npm](https://img.shields.io/npm/v/@ditherforge/core?style=flat-square&color=00ff41)](https://www.npmjs.com/package/@ditherforge/core)

<!-- TODO: Add GIF demo here -->
<!-- ![Demo](docs/demo.gif) -->

</div>

---

## Features

| Effect | Description |
|--------|-------------|
| ASCII | Brightness-mapped character ramp |
| Binary | 0/1 text grid with threshold |
| Braille | Unicode braille 2x4 dot mapping |
| Shape Match | NCC-based glyph matching |
| Edge Detect | Sobel direction → /\\|- characters |
| Color ASCII | Per-character RGB from source |
| Floyd-Steinberg | Error-diffusion dithering |
| Atkinson | High-contrast dithering |
| Bayer | Ordered dithering (2x2, 4x4, 8x8) |
| Halftone | Variable-radius dot grid |
| Pixel Art | Downscale + palette quantization |
| Glitch | Scanline shift, RGB split, noise |

### Studio Features

- **Drag & drop** or paste images, or use **webcam**
- **Real-time preview** via Web Worker
- **Customizable** colors, charsets, thresholds
- **Compare mode** — side-by-side split view
- **Export** — PNG, SVG, TXT, GIF, WebM, ANSI
- **Code export** — React, Web Component, HTML snippets
- **Presets** — built-in + save your own
- **Undo/Redo** — Ctrl+Z / Ctrl+Y
- **Share** — URL-encoded settings
- **Animated SVG** — reveal, scanline, flicker, matrix

### API (HuggingFace Space)

Generate ASCII art SVGs via HTTP — perfect for GitHub README embeds.

```
https://wisamwr-ditherforge-api.hf.space/api/text?text=Hello&style=ascii&color=00ff41
```

Endpoints: `/api/text`, `/api/avatar`, `/api/banner`

## Quick Start

### Use Online

Visit **[ditherforge.vercel.app](https://ditherforge.vercel.app)** — no install needed.

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
import { asciiEffect, rgbaToGrayscale } from '@ditherforge/core';

const gray = rgbaToGrayscale(rgbaData, width, height);
const result = asciiEffect(gray, {
  cols: 80,
  charset: ' .:-=+*#%@',
  brightness: 0,
  contrast: 0,
  invert: false,
});
console.log(result.text);
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Core | TypeScript, zero dependencies |
| Studio | React 18, Vite 6, Tailwind CSS v4 |
| API | Python, Gradio, HuggingFace Spaces |
| Tests | Vitest (81+ tests) |

## Project Structure

```
ditherforge/
├── packages/core/    # Pure-function effects library
├── apps/studio/      # React web application
└── spaces/api/       # HuggingFace Gradio API
```

## License

[MIT](LICENSE) — built by [@wisamWR](https://github.com/wisamWR)
