import type { GlyphBitmap } from '../types.js';

export function sortGlyphsByDensity(glyphs: GlyphBitmap[]): GlyphBitmap[] {
  return [...glyphs].sort((a, b) => a.density - b.density);
}

export function buildCalibratedCharset(glyphs: GlyphBitmap[]): string {
  return sortGlyphsByDensity(glyphs)
    .map((g) => g.char)
    .join('');
}

interface GlyphStats {
  mean: number;
  std: number;
  normalized: Float32Array;
}

export function precomputeGlyphStats(glyphs: GlyphBitmap[]): GlyphStats[] {
  return glyphs.map((g) => {
    const n = g.bitmap.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += g.bitmap[i];
    const mean = sum / n;
    let varSum = 0;
    for (let i = 0; i < n; i++) varSum += (g.bitmap[i] - mean) ** 2;
    const std = Math.sqrt(varSum / n);
    const normalized = new Float32Array(n);
    if (std > 0.5) {
      for (let i = 0; i < n; i++) normalized[i] = (g.bitmap[i] - mean) / std;
    }
    return { mean, std, normalized };
  });
}

export function nccMatch(
  cell: Float32Array,
  glyphs: GlyphBitmap[],
  stats?: GlyphStats[],
): number {
  const n = cell.length;
  let cellSum = 0;
  for (let i = 0; i < n; i++) cellSum += cell[i];
  const cellMean = cellSum / n;

  let cellVarSum = 0;
  for (let i = 0; i < n; i++) cellVarSum += (cell[i] - cellMean) ** 2;
  const cellStd = Math.sqrt(cellVarSum / n);

  if (cellStd < 1) {
    const brightness = 1 - cellMean / 255;
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let gi = 0; gi < glyphs.length; gi++) {
      const diff = Math.abs(glyphs[gi].density - brightness);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = gi;
      }
    }
    return bestIdx;
  }

  const glyphStats = stats ?? precomputeGlyphStats(glyphs);

  let bestNCC = -Infinity;
  let bestIdx = 0;

  for (let gi = 0; gi < glyphs.length; gi++) {
    const gs = glyphStats[gi];
    if (gs.std < 0.5) continue;

    let ncc = 0;
    for (let i = 0; i < n; i++) {
      ncc += ((cell[i] - cellMean) / cellStd) * gs.normalized[i];
    }
    ncc /= n;

    if (ncc > bestNCC) {
      bestNCC = ncc;
      bestIdx = gi;
    }
  }

  return bestIdx;
}
