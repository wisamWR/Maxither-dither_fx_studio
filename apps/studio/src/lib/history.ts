import { useCallback, useRef, useState } from 'react';

export interface HistoryState {
  effectType: string;
  effectConfig: Record<string, unknown>;
  fgColor: string;
  bgColor: string;
}

export interface UseHistoryReturn {
  /** Push current state to history (call when user makes a change) */
  push: (state: HistoryState) => void;
  /** Undo: returns previous state or null */
  undo: () => HistoryState | null;
  /** Redo: returns next state or null */
  redo: () => HistoryState | null;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

/**
 * Shallow-compare two effect config objects, skipping the 'glyphs' key.
 * Uint8Array (used in GlyphBitmap[]) doesn't serialize well with JSON.stringify,
 * so we exclude it and compare only the scalar/primitive config values.
 */
function configsEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keysA = Object.keys(a).filter((k) => k !== 'glyphs');
  const keysB = Object.keys(b).filter((k) => k !== 'glyphs');
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

export function useHistory(maxSize = 50): UseHistoryReturn {
  // Use refs for the stack to avoid re-renders on every push
  const stackRef = useRef<HistoryState[]>([]);
  const indexRef = useRef(-1);
  const [, forceUpdate] = useState(0);

  const push = useCallback(
    (state: HistoryState) => {
      const stack = stackRef.current;
      const idx = indexRef.current;

      // Skip if identical to current state
      if (idx >= 0) {
        const current = stack[idx];
        if (
          current.effectType === state.effectType &&
          current.fgColor === state.fgColor &&
          current.bgColor === state.bgColor &&
          configsEqual(current.effectConfig, state.effectConfig)
        ) {
          return;
        }
      }

      // Trim any future states (discard redo history)
      stackRef.current = stack.slice(0, idx + 1);

      // Add new state (deep-copy to avoid mutation issues)
      stackRef.current.push(structuredClone(state));

      // Enforce max size
      if (stackRef.current.length > maxSize) {
        stackRef.current.shift();
      } else {
        indexRef.current++;
      }

      forceUpdate((n) => n + 1);
    },
    [maxSize],
  );

  const undo = useCallback((): HistoryState | null => {
    if (indexRef.current <= 0) return null;
    indexRef.current--;
    forceUpdate((n) => n + 1);
    return structuredClone(stackRef.current[indexRef.current]);
  }, []);

  const redo = useCallback((): HistoryState | null => {
    if (indexRef.current >= stackRef.current.length - 1) return null;
    indexRef.current++;
    forceUpdate((n) => n + 1);
    return structuredClone(stackRef.current[indexRef.current]);
  }, []);

  return {
    push,
    undo,
    redo,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < stackRef.current.length - 1,
  };
}
