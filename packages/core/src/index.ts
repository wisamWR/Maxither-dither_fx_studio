// Types
export type {
  GrayscaleImage,
  RGBAImage,
  BaseConfig,
  BinaryConfig,
  AsciiConfig,
  BrailleConfig,
  DitherConfig,
  BayerConfig,
  HalftoneConfig,
  PixelArtConfig,
  TextResult,
  DitherResult,
  HalftoneDot,
  HalftoneResult,
  PixelArtResult,
  EffectResult,
  EffectType,
  ColorPalette,
  GlitchConfig,
  GlitchResult,
  // v0.2 types
  GlyphBitmap,
  ShapeAsciiConfig,
  EdgeAsciiConfig,
  ColorAsciiConfig,
  ColorTextResult,
  GradientMap,
  AnsiColorMode,
  AnsiExportOptions,
  SvgAnimation,
  AnimatedSvgOptions,
} from './types.js';

// Utilities
export {
  rgbaToGrayscale,
  adjustBrightness,
  adjustContrast,
  invertImage,
  applyAdjustments,
} from './utils/image-data.js';

export { PALETTES, hexToRgb, nearestColor } from './utils/palette.js';

export { gaussianBlur, sharpen, posterize } from './utils/filters.js';

// Edge detection
export { sobelGradient, directionToChar } from './utils/edge-detect.js';

// Glyph metrics
export {
  sortGlyphsByDensity,
  buildCalibratedCharset,
  precomputeGlyphStats,
  nccMatch,
} from './utils/glyph-metrics.js';

// Effects
export { binaryEffect } from './effects/binary.js';
export { asciiEffect, DEFAULT_ASCII_CHARSET } from './effects/ascii.js';
export { brailleEffect } from './effects/braille.js';
export { floydSteinberg } from './effects/floyd-steinberg.js';
export { atkinsonDither } from './effects/atkinson.js';
export { bayerDither } from './effects/bayer.js';
export { halftoneEffect } from './effects/halftone.js';
export { pixelArtEffect } from './effects/pixel-art.js';
export { shapeAsciiEffect } from './effects/shape-ascii.js';
export { edgeAsciiEffect } from './effects/edge-ascii.js';
export { colorAsciiEffect } from './effects/color-ascii.js';
export { glitchEffect } from './effects/glitch.js';

// Export
export { textToAnsi, colorTextToAnsi } from './export/ansi.js';

// SVG
export { textToSvg, halftonesToSvg, pixelArtToSvg } from './svg/builder.js';
export { textToAnimatedSvg } from './svg/animated.js';
