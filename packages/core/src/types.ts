/** Grayscale image: one byte (0-255) per pixel, row-major */
export interface GrayscaleImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** RGBA image data for color effects (pixel art) */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

// --- Effect configs ---

export interface BaseConfig {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  invert: boolean;
}

export interface BinaryConfig extends BaseConfig {
  cols: number;
  threshold: number; // 0-255
}

export interface AsciiConfig extends BaseConfig {
  cols: number;
  charset: string; // dark -> bright
}

export interface BrailleConfig extends BaseConfig {
  cols: number;
  threshold: number; // 0-255
}

export interface DitherConfig extends BaseConfig {
  threshold: number; // 0-255, default 128
}

export interface BayerConfig extends BaseConfig {
  matrixSize: 2 | 4 | 8;
}

export interface HalftoneConfig extends BaseConfig {
  dotSpacing: number;
  maxDotRadius: number;
  angle: number; // degrees 0-360
}

export interface PixelArtConfig extends BaseConfig {
  pixelSize: number;
  palette: string[]; // hex colors
}

export interface GlitchConfig extends BaseConfig {
  /** Intensity 0-100 */
  intensity: number;
  /** Seed for reproducible patterns */
  seed: number;
  /** Number of horizontal displacement bands */
  scanlineCount: number;
  /** Enable RGB channel separation */
  rgbSplit: boolean;
  /** Max pixel offset for RGB split */
  rgbSplitDistance: number;
}

// --- Effect results ---

export interface TextResult {
  text: string;
  rows: number;
  cols: number;
}

export interface DitherResult {
  data: Uint8Array; // 0 or 255 per pixel
  width: number;
  height: number;
}

export interface HalftoneDot {
  x: number;
  y: number;
  radius: number;
}

export interface HalftoneResult {
  dots: HalftoneDot[];
  width: number;
  height: number;
}

export interface PixelArtResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  pixelSize: number;
}

export interface GlitchResult {
  data: Uint8ClampedArray; // RGBA
  width: number;
  height: number;
  glitch: true; // discriminant
}

export type EffectResult = TextResult | DitherResult | HalftoneResult | PixelArtResult | ColorTextResult | GlitchResult;

export type EffectType =
  | 'binary'
  | 'ascii'
  | 'braille'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'bayer'
  | 'halftone'
  | 'pixel-art'
  | 'shape-ascii'
  | 'edge-ascii'
  | 'color-ascii'
  | 'glitch';

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

// --- v0.2 types ---

/** Pre-rendered glyph bitmap for shape matching */
export interface GlyphBitmap {
  char: string;
  /** Grayscale pixels, row-major (0=black, 255=white) */
  bitmap: Uint8Array;
  width: number;
  height: number;
  /** Ink density: fraction of dark pixels (0=empty, 1=fully filled) */
  density: number;
}

/** Config for shape-matching ASCII */
export interface ShapeAsciiConfig extends BaseConfig {
  cols: number;
  glyphs: GlyphBitmap[];
}

/** Config for edge-direction ASCII */
export interface EdgeAsciiConfig extends BaseConfig {
  cols: number;
  /** Minimum gradient magnitude (0–255) to render an edge character */
  edgeThreshold: number;
  /** 'edge-only' shows only edges, 'hybrid' fills non-edges with brightness chars */
  mode: 'edge-only' | 'hybrid';
  /** Brightness charset used in hybrid mode for non-edge cells */
  charset: string;
}

/** Config for color ASCII */
export interface ColorAsciiConfig extends BaseConfig {
  cols: number;
  charset: string;
}

/** ASCII text with per-character color information */
export interface ColorTextResult {
  text: string;
  rows: number;
  cols: number;
  /** Hex color per character, indexed [row][col] */
  colors: string[][];
}

/** Full gradient map of an image */
export interface GradientMap {
  magnitudes: Float32Array;
  directions: Float32Array;
  width: number;
  height: number;
  maxMagnitude: number;
}

/** ANSI color mode */
export type AnsiColorMode = '16' | '256' | 'truecolor';

/** Options for ANSI export */
export interface AnsiExportOptions {
  mode: AnsiColorMode;
  /** Use background color fills instead of foreground */
  useBackground: boolean;
}

/** Options for animated SVG */
export type SvgAnimation = 'none' | 'reveal' | 'scanline' | 'flicker' | 'matrix';

export interface AnimatedSvgOptions {
  fontSize: number;
  color: string;
  bgColor: string;
  animation: SvgAnimation;
  /** Animation duration in seconds */
  duration: number;
}
