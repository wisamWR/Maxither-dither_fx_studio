import type { EffectType } from '@ditherforge/core';

export interface Preset {
  id: string;
  name: string;
  category: 'built-in' | 'custom';
  effectType: EffectType;
  config: Record<string, unknown>;
  fgColor: string;
  bgColor: string;
}

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'retro-green',
    name: 'Retro Terminal',
    category: 'built-in',
    effectType: 'ascii',
    config: { cols: 80, charset: ' .:-=+*#%@', brightness: 0, contrast: 20, invert: false },
    fgColor: '#00ff41',
    bgColor: '#0d1117',
  },
  {
    id: 'matrix',
    name: 'Matrix Rain',
    category: 'built-in',
    effectType: 'binary',
    config: { cols: 120, threshold: 100, brightness: -20, contrast: 40, invert: false },
    fgColor: '#00ff41',
    bgColor: '#000000',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    category: 'built-in',
    effectType: 'edge-ascii',
    config: { cols: 100, edgeThreshold: 25, edgeMode: 'edge-only', charset: ' .:-=+*#%@', brightness: 0, contrast: 0, invert: false },
    fgColor: '#4fc3f7',
    bgColor: '#0d47a1',
  },
  {
    id: 'neon-glitch',
    name: 'Neon Glitch',
    category: 'built-in',
    effectType: 'glitch',
    config: { intensity: 70, seed: 42, scanlineCount: 15, rgbSplit: true, rgbSplitDistance: 8, brightness: 10, contrast: 30, invert: false },
    fgColor: '#ff00ff',
    bgColor: '#0a0a0a',
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    category: 'built-in',
    effectType: 'ascii',
    config: { cols: 60, charset: ' .oO@', brightness: 10, contrast: 0, invert: false },
    fgColor: '#2c2c2c',
    bgColor: '#f5f0e8',
  },
  {
    id: 'halftone-print',
    name: 'Newspaper',
    category: 'built-in',
    effectType: 'halftone',
    config: { dotSpacing: 6, maxDotRadius: 3, angle: 45, brightness: 0, contrast: 10, invert: false },
    fgColor: '#1a1a1a',
    bgColor: '#f0ead6',
  },
  {
    id: 'pixel-gameboy',
    name: 'Game Boy',
    category: 'built-in',
    effectType: 'pixel-art',
    config: { pixelSize: 6, paletteId: 'gameboy', palette: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'], brightness: 0, contrast: 0, invert: false },
    fgColor: '#9bbc0f',
    bgColor: '#0f380f',
  },
  {
    id: 'color-pop',
    name: 'Color Pop',
    category: 'built-in',
    effectType: 'color-ascii',
    config: { cols: 80, charset: ' .:;+=xX$&', brightness: 10, contrast: 20, invert: false },
    fgColor: '#ffffff',
    bgColor: '#000000',
  },
];

const STORAGE_KEY = 'ditherforge-presets';

export function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: Omit<Preset, 'id' | 'category'>): Preset {
  const customs = loadCustomPresets();
  const newPreset: Preset = {
    ...preset,
    id: `custom-${Date.now()}`,
    category: 'custom',
  };
  customs.push(newPreset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
  return newPreset;
}

export function deleteCustomPreset(id: string): void {
  const customs = loadCustomPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
}
