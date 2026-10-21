import type {
  TextResult, DitherResult, HalftoneResult, PixelArtResult,
  ColorTextResult, EffectResult, EffectType,
} from '@ditherforge/core';

export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  result: EffectResult,
  effectType: EffectType,
  fgColor: string,
  bgColor: string,
  transparentBg: boolean,
) {
  if ('colors' in result && 'text' in result) {
    renderColorText(ctx, result as ColorTextResult, bgColor, transparentBg);
  } else if ('text' in result) {
    renderText(ctx, result as TextResult, fgColor, bgColor, transparentBg);
  } else if ('dots' in result) {
    renderHalftone(ctx, result as HalftoneResult, fgColor, bgColor, transparentBg);
  } else if ('pixelSize' in result) {
    renderPixelArt(ctx, result as PixelArtResult);
  } else {
    renderDither(ctx, result as DitherResult, fgColor, bgColor, transparentBg);
  }
}

function renderText(
  ctx: CanvasRenderingContext2D, result: TextResult,
  fgColor: string, bgColor: string, transparentBg: boolean,
) {
  const fontSize = 14;
  const charW = fontSize * 0.6;
  const lineH = fontSize * 1.2;
  const lines = result.text.split('\n');
  const w = Math.ceil(result.cols * charW);
  const h = Math.ceil(lines.length * lineH);
  ctx.canvas.width = w;
  ctx.canvas.height = h;

  if (!transparentBg) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = fgColor;
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 0, i * lineH);
  }
}

function renderDither(
  ctx: CanvasRenderingContext2D, result: DitherResult,
  fgColor: string, bgColor: string, transparentBg: boolean,
) {
  const { data, width, height } = result;
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  const imgData = ctx.createImageData(width, height);
  const fg = hexToRgbArr(fgColor);
  const bg = hexToRgbArr(bgColor);

  for (let i = 0; i < data.length; i++) {
    const o = i * 4;
    if (data[i] === 255) {
      imgData.data[o] = fg[0]; imgData.data[o + 1] = fg[1]; imgData.data[o + 2] = fg[2]; imgData.data[o + 3] = 255;
    } else {
      imgData.data[o] = bg[0]; imgData.data[o + 1] = bg[1]; imgData.data[o + 2] = bg[2];
      imgData.data[o + 3] = transparentBg ? 0 : 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function renderHalftone(
  ctx: CanvasRenderingContext2D, result: HalftoneResult,
  fgColor: string, bgColor: string, transparentBg: boolean,
) {
  ctx.canvas.width = result.width;
  ctx.canvas.height = result.height;
  if (!transparentBg) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, result.width, result.height);
  } else {
    ctx.clearRect(0, 0, result.width, result.height);
  }
  ctx.fillStyle = fgColor;
  for (const dot of result.dots) {
    if (dot.radius > 0.1) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function renderPixelArt(ctx: CanvasRenderingContext2D, result: PixelArtResult) {
  const { data, width, height, pixelSize } = result;
  const w = width * pixelSize;
  const h = height * pixelSize;
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      ctx.fillStyle = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
}

function renderColorText(
  ctx: CanvasRenderingContext2D,
  result: ColorTextResult,
  bgColor: string,
  transparentBg: boolean,
) {
  const fontSize = 14;
  const charW = fontSize * 0.6;
  const lineH = fontSize * 1.2;
  const lines = result.text.split('\n');
  const w = Math.ceil(result.cols * charW);
  const h = Math.ceil(lines.length * lineH);
  ctx.canvas.width = w;
  ctx.canvas.height = h;

  if (!transparentBg) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'top';

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    const rowColors = result.colors[row] ?? [];

    for (let col = 0; col < line.length; col++) {
      ctx.fillStyle = rowColors[col] ?? '#ffffff';
      ctx.fillText(line[col], col * charW, row * lineH);
    }
  }
}

function hexToRgbArr(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}
