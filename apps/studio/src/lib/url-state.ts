import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { EffectType } from '@ditherforge/core';

interface ShareableState {
  effectType: EffectType;
  effectConfig: Record<string, unknown>;
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
}

export function stateToHash(state: ShareableState): string {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

export function hashToState(hash: string): ShareableState | null {
  if (!hash) return null;
  try {
    const json = decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    return JSON.parse(json) as ShareableState;
  } catch {
    return null;
  }
}

export function pushStateToUrl(state: ShareableState) {
  window.history.replaceState(null, '', `#${stateToHash(state)}`);
}

export function readStateFromUrl(): ShareableState | null {
  return hashToState(window.location.hash.slice(1));
}
