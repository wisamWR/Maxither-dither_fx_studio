import type { EffectType } from '@ditherforge/core';

export interface StudioState {
  sourceImage: ImageData | null;
  effectType: EffectType;
  effectConfig: Record<string, unknown>;
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
}

export const DEFAULT_STATE: StudioState = {
  sourceImage: null,
  effectType: 'ascii',
  effectConfig: {
    cols: 80,
    threshold: 128,
    charset: ' .:-=+*#%@',
    brightness: 0,
    contrast: 0,
    invert: false,
    matrixSize: 4,
    dotSpacing: 8,
    maxDotRadius: 4,
    angle: 0,
    pixelSize: 8,
    paletteId: 'mono',
    palette: ['#000000', '#ffffff'],
  },
  fgColor: '#00ff41',
  bgColor: '#0d1117',
  transparentBg: false,
};
