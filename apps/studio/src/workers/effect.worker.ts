import {
  rgbaToGrayscale, binaryEffect, asciiEffect, brailleEffect,
  floydSteinberg, atkinsonDither, bayerDither,
  halftoneEffect, pixelArtEffect,
  shapeAsciiEffect, edgeAsciiEffect, colorAsciiEffect,
  glitchEffect,
  gaussianBlur, sharpen, posterize,
  ssim, psnr, resizeGray, rasterizeBraille, rasterizeText,
} from '@ditherforge/core';
import type {
  EffectType, BinaryConfig, AsciiConfig, BrailleConfig,
  DitherConfig, BayerConfig, HalftoneConfig, PixelArtConfig, EffectResult,
  ShapeAsciiConfig, EdgeAsciiConfig, ColorAsciiConfig, GlyphBitmap,
  GlitchConfig,
  GrayscaleImage, TextResult, DitherResult, DisplayPolarity,
} from '@ditherforge/core';

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

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { requestId, rgba, width, height, effectType, config, fgColor, bgColor } = e.data;
  const t0 = performance.now();

  let gray = rgbaToGrayscale(rgba, width, height);

  // Apply preprocessing filters
  const blurRadius = (config.filterBlur as number) ?? 0;
  const sharpenAmount = (config.filterSharpen as number) ?? 0;
  const posterizeLevels = (config.filterPosterize as number) ?? 0;
  if (blurRadius > 0) gray = gaussianBlur(gray, blurRadius);
  if (sharpenAmount > 0) gray = sharpen(gray, sharpenAmount);
  if (posterizeLevels >= 2 && posterizeLevels < 256) gray = posterize(gray, posterizeLevels);

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
    case 'glitch':
      result = glitchEffect(
        { width, height, data: rgba },
        {
          ...base,
          intensity: (config.intensity as number) ?? 50,
          seed: (config.seed as number) ?? 42,
          scanlineCount: (config.scanlineCount as number) ?? 10,
          rgbSplit: (config.rgbSplit as boolean) ?? true,
          rgbSplitDistance: (config.rgbSplitDistance as number) ?? 5,
        } satisfies GlitchConfig,
      );
      break;
    default:
      throw new Error(`Unknown effect: ${effectType}`);
  }

  // Phase 1: Post effect result immediately
  const effectResponse: EffectResponse = {
    type: 'effect',
    requestId,
    result,
    effectType,
    durationMs: performance.now() - t0,
  };
  self.postMessage(effectResponse);

  // Phase 2: Compute metrics and post separately
  const polarity: DisplayPolarity = fgColor && bgColor && luminance(fgColor) > luminance(bgColor)
    ? 'light-on-dark'
    : 'dark-on-light';

  let ssimScore: number | null = null;
  let psnrScore: number | null = null;

  try {
    switch (effectType) {
      case 'floyd-steinberg':
      case 'atkinson':
      case 'bayer': {
        const ditherResult = result as DitherResult;
        const ditherImg: GrayscaleImage = {
          data: ditherResult.data,
          width: ditherResult.width,
          height: ditherResult.height,
        };
        const blurredRef = gaussianBlur(gray, 1);
        const blurredDither = gaussianBlur(ditherImg, 1);
        ssimScore = ssim(blurredRef, blurredDither);
        psnrScore = psnr(blurredRef, blurredDither);
        break;
      }
      case 'braille': {
        const brailleImg = rasterizeBraille(result as TextResult, polarity);
        const resized = resizeGray(brailleImg, gray.width, gray.height, 'stretch');
        const blurredRef = gaussianBlur(gray, 1);
        const blurredRaster = gaussianBlur(resized, 1);
        ssimScore = ssim(blurredRef, blurredRaster);
        psnrScore = psnr(blurredRef, blurredRaster);
        break;
      }
      case 'shape-ascii': {
        const glyphs = (config.glyphs as GlyphBitmap[]) ?? [];
        if (glyphs.length > 0) {
          const rasterized = rasterizeText(result as TextResult, glyphs, polarity);
          const resized = resizeGray(rasterized, gray.width, gray.height, 'stretch');
          const blurredRef = gaussianBlur(gray, 1);
          const blurredRaster = gaussianBlur(resized, 1);
          ssimScore = ssim(blurredRef, blurredRaster);
          psnrScore = psnr(blurredRef, blurredRaster);
        }
        break;
      }
      // All others: no SSIM/PSNR
      default:
        break;
    }
  } catch {
    // If metrics computation fails, leave as null
  }

  const metricsResponse: MetricsResponse = {
    type: 'metrics',
    requestId,
    ssim: ssimScore,
    psnr: psnrScore,
  };
  self.postMessage(metricsResponse);
};
