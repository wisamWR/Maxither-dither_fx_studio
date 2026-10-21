import type { TextResult, HalftoneResult, PixelArtResult } from '../types.js';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface TextSvgOptions {
  fontSize: number;
  color: string;
  bgColor: string | undefined;
}

export function textToSvg(result: TextResult, opts: TextSvgOptions): string {
  const lines = result.text.split('\n');
  const charW = opts.fontSize * 0.6;
  const lineH = opts.fontSize * 1.2;
  const svgW = Math.ceil(result.cols * charW);
  const svgH = Math.ceil(lines.length * lineH);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;

  if (opts.bgColor) {
    svg += `<rect width="100%" height="100%" fill="${opts.bgColor}"/>`;
  }

  svg += `<text font-family="monospace" font-size="${opts.fontSize}" fill="${opts.color}">`;

  for (let i = 0; i < lines.length; i++) {
    const y = (i + 1) * lineH - (lineH - opts.fontSize) / 2;
    svg += `<tspan x="0" y="${y.toFixed(1)}">${escapeXml(lines[i])}</tspan>`;
  }

  svg += '</text></svg>';
  return svg;
}

interface HalftoneSvgOptions {
  color: string;
  bgColor: string;
}

export function halftonesToSvg(result: HalftoneResult, opts: HalftoneSvgOptions): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${result.width}" height="${result.height}" viewBox="0 0 ${result.width} ${result.height}">`;
  svg += `<rect width="100%" height="100%" fill="${opts.bgColor}"/>`;

  for (const dot of result.dots) {
    if (dot.radius > 0) {
      svg += `<circle cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="${dot.radius.toFixed(1)}" fill="${opts.color}"/>`;
    }
  }

  svg += '</svg>';
  return svg;
}

export function pixelArtToSvg(result: PixelArtResult): string {
  const { data, width, height, pixelSize } = result;
  const svgW = width * pixelSize;
  const svgH = height * pixelSize;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" shape-rendering="crispEdges">`;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      svg += `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${hex}"/>`;
    }
  }

  svg += '</svg>';
  return svg;
}
