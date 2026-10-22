// packages/core/src/metrics/ssim.ts
import type { GrayscaleImage } from '../types.js';

export function mse(a: GrayscaleImage, b: GrayscaleImage): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Dimension mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  const n = a.data.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a.data[i] - b.data[i];
    sum += d * d;
  }
  return sum / n;
}

export function psnr(a: GrayscaleImage, b: GrayscaleImage): number {
  const m = mse(a, b);
  if (m === 0) return Infinity;
  return 10 * Math.log10((255 * 255) / m);
}

/**
 * Structural Similarity Index — simplified variant.
 * Uses uniform sliding window (NOT Gaussian 11×11 from Wang 2004).
 * Returns null if image is too small for the window.
 */
export function ssim(
  a: GrayscaleImage,
  b: GrayscaleImage,
  windowSize: number = 7,
): number | null {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Dimension mismatch: ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }

  const { width, height } = a;
  if (width < windowSize * 2 || height < windowSize * 2) return null;

  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const winArea = windowSize * windowSize;

  let totalSsim = 0;
  let windowCount = 0;

  for (let wy = 0; wy <= height - windowSize; wy++) {
    for (let wx = 0; wx <= width - windowSize; wx++) {
      let sumA = 0, sumB = 0, sumAA = 0, sumBB = 0, sumAB = 0;

      for (let dy = 0; dy < windowSize; dy++) {
        const rowOff = (wy + dy) * width + wx;
        for (let dx = 0; dx < windowSize; dx++) {
          const va = a.data[rowOff + dx];
          const vb = b.data[rowOff + dx];
          sumA += va;
          sumB += vb;
          sumAA += va * va;
          sumBB += vb * vb;
          sumAB += va * vb;
        }
      }

      const muA = sumA / winArea;
      const muB = sumB / winArea;
      const sigmaAA = sumAA / winArea - muA * muA;
      const sigmaBB = sumBB / winArea - muB * muB;
      const sigmaAB = sumAB / winArea - muA * muB;

      const num = (2 * muA * muB + C1) * (2 * sigmaAB + C2);
      const den = (muA * muA + muB * muB + C1) * (sigmaAA + sigmaBB + C2);

      totalSsim += num / den;
      windowCount++;
    }
  }

  return windowCount > 0 ? totalSsim / windowCount : null;
}
