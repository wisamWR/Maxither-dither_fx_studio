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

// Effects
export { binaryEffect } from './effects/binary.js';
export { asciiEffect, DEFAULT_ASCII_CHARSET } from './effects/ascii.js';
export { brailleEffect } from './effects/braille.js';
export { floydSteinberg } from './effects/floyd-steinberg.js';
export { atkinsonDither } from './effects/atkinson.js';
export { bayerDither } from './effects/bayer.js';
export { halftoneEffect } from './effects/halftone.js';
export { pixelArtEffect } from './effects/pixel-art.js';

// SVG
export { textToSvg, halftonesToSvg, pixelArtToSvg } from './svg/builder.js';
