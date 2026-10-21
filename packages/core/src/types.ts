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

export type EffectResult = TextResult | DitherResult | HalftoneResult | PixelArtResult;

export type EffectType =
  | 'binary'
  | 'ascii'
  | 'braille'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'bayer'
  | 'halftone'
  | 'pixel-art';

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}
