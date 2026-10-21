import type {
  EffectResult, EffectType, TextResult, HalftoneResult, PixelArtResult,
  AnsiExportOptions, AnimatedSvgOptions, ColorTextResult,
} from '@ditherforge/core';
import {
  textToSvg, halftonesToSvg, pixelArtToSvg,
  textToAnsi, colorTextToAnsi, textToAnimatedSvg,
} from '@ditherforge/core';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPng(canvas: HTMLCanvasElement) {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, 'ditherforge.png');
  }, 'image/png');
}

export function exportSvg(
  result: EffectResult, effectType: EffectType, fgColor: string, bgColor: string,
) {
  let svg: string;

  if ('text' in result) {
    svg = textToSvg(result as TextResult, { fontSize: 14, color: fgColor, bgColor });
  } else if ('dots' in result) {
    svg = halftonesToSvg(result as HalftoneResult, { color: fgColor, bgColor });
  } else if ('pixelSize' in result) {
    svg = pixelArtToSvg(result as PixelArtResult);
  } else {
    // Dither: embed as inline PNG in SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const r = result as { data: Uint8Array; width: number; height: number };
    canvas.width = r.width;
    canvas.height = r.height;
    const imgData = ctx.createImageData(r.width, r.height);
    for (let i = 0; i < r.data.length; i++) {
      const o = i * 4;
      const v = r.data[i];
      imgData.data[o] = v; imgData.data[o + 1] = v; imgData.data[o + 2] = v; imgData.data[o + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}"><image href="${dataUrl}" width="${r.width}" height="${r.height}"/></svg>`;
  }

  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'ditherforge.svg');
}

export function exportTxt(result: EffectResult) {
  if (!('text' in result)) return;
  downloadBlob(new Blob([(result as TextResult).text], { type: 'text/plain' }), 'ditherforge.txt');
}

export function exportAnsi(
  result: EffectResult,
  fgColor: string,
  opts: AnsiExportOptions,
): string | null {
  if ('colors' in result && 'text' in result) {
    return colorTextToAnsi(result as ColorTextResult, opts);
  }
  if ('text' in result) {
    return textToAnsi(result as TextResult, fgColor, opts);
  }
  return null;
}

export function exportAnimatedSvg(
  result: EffectResult,
  opts: AnimatedSvgOptions,
): void {
  if (!('text' in result)) return;
  const svg = textToAnimatedSvg(result as TextResult, opts);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'ditherforge-animated.svg');
}

export async function copyToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}
