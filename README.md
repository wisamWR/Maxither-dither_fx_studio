# DitherForge

> Turn any image into binary, ASCII, braille, dither, halftone, or pixel art - realtime, in your browser, no upload.

## Features

- **8 effects:** Binary, ASCII, Braille, Floyd-Steinberg, Atkinson, Bayer, Halftone, Pixel Art
- **Realtime preview** with adjustable brightness, contrast, threshold, and more
- **Color palettes:** Monochrome, Game Boy, CGA, Commodore 64, Grayscale
- **Export:** PNG, SVG, TXT, copy to clipboard
- **Shareable settings** via URL hash
- **100% client-side** - your images never leave your device

## Development

```bash
npm install
npm run dev        # Start studio dev server
npm test           # Run core tests
npm run build      # Build for production
```

## Project Structure

```
ditherforge/
├── packages/core/     # Pure-function effect algorithms (no DOM)
│   ├── src/effects/   # binary, ascii, braille, dither, halftone, pixel-art
│   ├── src/utils/     # image-data, palette
│   ├── src/svg/       # SVG builders
│   └── tests/         # Vitest tests
└── apps/studio/       # React + Vite web app
    └── src/
        ├── components/  # UI components
        ├── workers/     # Web Worker for off-thread processing
        └── lib/         # export, url-state, canvas-renderer
```

## License

MIT
