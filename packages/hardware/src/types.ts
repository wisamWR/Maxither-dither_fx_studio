export interface Panel {
  id: string;
  name: string;
  width: number;
  height: number;
  pixelShape: 'square' | 'round';
  tint: string;
  category: 'oled' | 'epaper' | 'led' | 'thermal';
  oneIs: 'bright' | 'dark';
  notes: string;
}

export type BitLayout = 'row-msb' | 'row-lsb' | 'page-vertical';

export interface CArrayOptions {
  name: string;
  layout: BitLayout;
  progmem: boolean;
  invert: boolean;
  includeSize: boolean;
}

export interface MicroPythonOptions {
  name: string;
  invert: boolean;
  format: 'MONO_HLSB' | 'MONO_VLSB';
}

export interface EscPosOptions {
  scale: 0 | 1 | 2 | 3;
  feedAfter?: number;
}
