import {
  rgbaToGrayscale, binaryEffect, asciiEffect, brailleEffect,
  floydSteinberg, atkinsonDither, bayerDither,
  halftoneEffect, pixelArtEffect,
  shapeAsciiEffect, edgeAsciiEffect, colorAsciiEffect,
} from '@ditherforge/core';
import type {
  EffectType, BinaryConfig, AsciiConfig, BrailleConfig,
  DitherConfig, BayerConfig, HalftoneConfig, PixelArtConfig, EffectResult,
  ShapeAsciiConfig, EdgeAsciiConfig, ColorAsciiConfig, GlyphBitmap,
} from '@ditherforge/core';

export interface WorkerRequest {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  effectType: EffectType;
  config: Record<string, unknown>;
}

export interface WorkerResponse {
  result: EffectResult;
  effectType: EffectType;
  durationMs: number;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { rgba, width, height, effectType, config } = e.data;
  const t0 = performance.now();

  const gray = rgbaToGrayscale(rgba, width, height);
  const base = {
    brightness: (config.brightness as number) ?? 0,
    contrast: (config.contrast as number) ?? 0,
    invert: (config.invert as boolean) ?? false,
  };

  let result: EffectResult;

  switch (effectType) {
    case 'binary':
      result = binaryEffect(gray, { ...base, cols: (config.cols as number) ?? 80, threshold: (config.threshold as number) ?? 128 } satisfies BinaryConfig);
      break;
    case 'ascii':
      result = asciiEffect(gray, { ...base, cols: (config.cols as number) ?? 80, charset: (config.charset as string) ?? ' .:-=+*#%@' } satisfies AsciiConfig);
      break;
    case 'braille':
      result = brailleEffect(gray, { ...base, cols: (config.cols as number) ?? 80, threshold: (config.threshold as number) ?? 128 } satisfies BrailleConfig);
      break;
    case 'floyd-steinberg':
      result = floydSteinberg(gray, { ...base, threshold: (config.threshold as number) ?? 128 } satisfies DitherConfig);
      break;
    case 'atkinson':
      result = atkinsonDither(gray, { ...base, threshold: (config.threshold as number) ?? 128 } satisfies DitherConfig);
      break;
    case 'bayer':
      result = bayerDither(gray, { ...base, matrixSize: (config.matrixSize as 2 | 4 | 8) ?? 4 } satisfies BayerConfig);
      break;
    case 'halftone':
      result = halftoneEffect(gray, { ...base, dotSpacing: (config.dotSpacing as number) ?? 8, maxDotRadius: (config.maxDotRadius as number) ?? 4, angle: (config.angle as number) ?? 0 } satisfies HalftoneConfig);
      break;
    case 'pixel-art':
      result = pixelArtEffect({ width, height, data: rgba }, { ...base, pixelSize: (config.pixelSize as number) ?? 8, palette: (config.palette as string[]) ?? ['#000000', '#ffffff'] } satisfies PixelArtConfig);
      break;
    case 'shape-ascii':
      result = shapeAsciiEffect(gray, {
        ...base,
        cols: (config.cols as number) ?? 80,
        glyphs: (config.glyphs as GlyphBitmap[]) ?? [],
      } satisfies ShapeAsciiConfig);
      break;
    case 'edge-ascii':
      result = edgeAsciiEffect(gray, {
        ...base,
        cols: (config.cols as number) ?? 80,
        edgeThreshold: (config.edgeThreshold as number) ?? 30,
        mode: (config.edgeMode as 'edge-only' | 'hybrid') ?? 'hybrid',
        charset: (config.charset as string) ?? ' .:-=+*#%@',
      } satisfies EdgeAsciiConfig);
      break;
    case 'color-ascii':
      result = colorAsciiEffect(
        { width, height, data: rgba },
        {
          ...base,
          cols: (config.cols as number) ?? 80,
          charset: (config.charset as string) ?? ' .:-=+*#%@',
        } satisfies ColorAsciiConfig,
      );
      break;
    default:
      throw new Error(`Unknown effect: ${effectType}`);
  }

  const response: WorkerResponse = { result, effectType, durationMs: performance.now() - t0 };
  self.postMessage(response);
};
