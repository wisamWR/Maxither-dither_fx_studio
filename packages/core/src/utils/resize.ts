import type { GrayscaleImage } from '../types.js';

export type ResizeFit = 'contain' | 'cover' | 'stretch';

export function resizeGray(
  img: GrayscaleImage,
  targetW: number,
  targetH: number,
  fit: ResizeFit,
  padValue: number = 255,
): GrayscaleImage {
  if (targetH === 0) {
    targetH = Math.round(img.height * targetW / img.width);
    if (targetH < 1) targetH = 1;
  }

  if (img.width === targetW && img.height === targetH) {
    return { width: targetW, height: targetH, data: new Uint8Array(img.data) };
  }

  if (fit === 'stretch') {
    return scaleImage(img, targetW, targetH);
  }

  const scaleX = targetW / img.width;
  const scaleY = targetH / img.height;

  if (fit === 'contain') {
    const scale = Math.min(scaleX, scaleY);
    const scaledW = Math.round(img.width * scale);
    const scaledH = Math.round(img.height * scale);
    const scaled = scaleImage(img, scaledW, scaledH);

    const out = new Uint8Array(targetW * targetH);
    out.fill(padValue);
    const offX = Math.floor((targetW - scaledW) / 2);
    const offY = Math.floor((targetH - scaledH) / 2);
    for (let y = 0; y < scaledH; y++) {
      for (let x = 0; x < scaledW; x++) {
        out[(offY + y) * targetW + (offX + x)] = scaled.data[y * scaledW + x];
      }
    }
    return { width: targetW, height: targetH, data: out };
  }

  // cover
  const scale = Math.max(scaleX, scaleY);
  const scaledW = Math.round(img.width * scale);
  const scaledH = Math.round(img.height * scale);
  const scaled = scaleImage(img, scaledW, scaledH);

  const cropX = Math.floor((scaledW - targetW) / 2);
  const cropY = Math.floor((scaledH - targetH) / 2);
  const out = new Uint8Array(targetW * targetH);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      out[y * targetW + x] = scaled.data[(cropY + y) * scaledW + (cropX + x)];
    }
  }
  return { width: targetW, height: targetH, data: out };
}

function scaleImage(img: GrayscaleImage, tw: number, th: number): GrayscaleImage {
  const { width: sw, height: sh, data: src } = img;
  const out = new Uint8Array(tw * th);

  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = tx * sw / tw;
      const sy0 = ty * sh / th;
      const sx1 = (tx + 1) * sw / tw;
      const sy1 = (ty + 1) * sh / th;

      let sum = 0;
      let count = 0;
      const iy0 = Math.floor(sy0);
      const iy1 = Math.min(Math.ceil(sy1), sh);
      const ix0 = Math.floor(sx0);
      const ix1 = Math.min(Math.ceil(sx1), sw);

      for (let iy = iy0; iy < iy1; iy++) {
        const wy = Math.min(iy + 1, sy1) - Math.max(iy, sy0);
        for (let ix = ix0; ix < ix1; ix++) {
          const wx = Math.min(ix + 1, sx1) - Math.max(ix, sx0);
          const w = wx * wy;
          sum += src[iy * sw + ix] * w;
          count += w;
        }
      }
      out[ty * tw + tx] = count > 0 ? Math.round(sum / count) : 0;
    }
  }
  return { width: tw, height: th, data: out };
}
