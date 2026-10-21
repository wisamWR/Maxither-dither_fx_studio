import type { TextResult, AnimatedSvgOptions, SvgAnimation } from '../types.js';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function animationCss(anim: SvgAnimation, duration: number, rows: number): string {
  switch (anim) {
    case 'none':
      return '';

    case 'reveal':
      return `
      <style>
        .row { opacity: 0; animation: reveal 0.15s ease-out forwards; }
        @keyframes reveal { from { opacity: 0; } to { opacity: 1; } }
        ${Array.from({ length: rows }, (_, i) =>
          `.row-${i} { animation-delay: ${(i * duration / rows).toFixed(2)}s; }`
        ).join('\n        ')}
      </style>`;

    case 'scanline':
      return `
      <style>
        @keyframes scan {
          0% { transform: translateY(-5%); opacity: 1; }
          100% { transform: translateY(105%); opacity: 1; }
        }
        .scanline {
          animation: scan ${duration}s linear infinite;
        }
      </style>`;

    case 'flicker':
      return `
      <style>
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.3; }
          94% { opacity: 1; }
          96% { opacity: 0.5; }
          97% { opacity: 1; }
        }
        text { animation: flicker ${duration}s ease-in-out infinite; }
      </style>`;

    case 'matrix':
      return `
      <style>
        .row { opacity: 0; animation: matrix ${(duration * 0.3).toFixed(2)}s ease-out forwards; }
        @keyframes matrix {
          0% { opacity: 0; transform: translateY(-20px); }
          60% { opacity: 1; }
          100% { opacity: 1; transform: translateY(0); }
        }
        ${Array.from({ length: rows }, (_, i) =>
          `.row-${i} { animation-delay: ${(i * duration / rows).toFixed(2)}s; }`
        ).join('\n        ')}
      </style>`;
  }
}

export function textToAnimatedSvg(result: TextResult, opts: AnimatedSvgOptions): string {
  const lines = result.text.split('\n');
  const charW = opts.fontSize * 0.6;
  const lineH = opts.fontSize * 1.2;
  const svgW = Math.ceil(result.cols * charW);
  const svgH = Math.ceil(lines.length * lineH);

  const css = animationCss(opts.animation, opts.duration, lines.length);
  const useRowClass = opts.animation === 'reveal' || opts.animation === 'matrix';

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;

  svg += `<rect width="100%" height="100%" fill="${opts.bgColor}"/>`;

  if (css) svg += css;

  svg += `<text font-family="monospace" font-size="${opts.fontSize}" fill="${opts.color}">`;

  for (let i = 0; i < lines.length; i++) {
    const y = (i + 1) * lineH - (lineH - opts.fontSize) / 2;
    const cls = useRowClass ? ` class="row row-${i}"` : '';
    svg += `<tspan x="0" y="${y.toFixed(1)}"${cls}>${escapeXml(lines[i])}</tspan>`;
  }

  svg += '</text>';

  if (opts.animation === 'scanline') {
    svg += `<rect class="scanline" x="0" y="0" width="100%" height="${lineH}" fill="${opts.color}" opacity="0.15"/>`;
  }

  svg += '</svg>';
  return svg;
}
