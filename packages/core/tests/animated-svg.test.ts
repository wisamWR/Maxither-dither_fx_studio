import { describe, it, expect } from 'vitest';
import { textToAnimatedSvg } from '../src/svg/animated.js';
import type { TextResult, AnimatedSvgOptions } from '../src/types.js';

const text: TextResult = { text: 'AB\nCD', rows: 2, cols: 2 };
const baseOpts: AnimatedSvgOptions = {
  fontSize: 14,
  color: '#00ff41',
  bgColor: '#0d1117',
  animation: 'none',
  duration: 2,
};

describe('textToAnimatedSvg', () => {
  it('produces valid SVG with no animation', () => {
    const svg = textToAnimatedSvg(text, { ...baseOpts, animation: 'none' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('AB');
    expect(svg).not.toContain('@keyframes');
  });

  it('reveal animation adds @keyframes reveal', () => {
    const svg = textToAnimatedSvg(text, { ...baseOpts, animation: 'reveal' });
    expect(svg).toContain('@keyframes reveal');
    expect(svg).toContain('animation-delay');
  });

  it('scanline animation adds a scanline rect', () => {
    const svg = textToAnimatedSvg(text, { ...baseOpts, animation: 'scanline' });
    expect(svg).toContain('@keyframes scan');
    expect(svg).toContain('class="scanline"');
  });

  it('flicker animation adds opacity keyframes', () => {
    const svg = textToAnimatedSvg(text, { ...baseOpts, animation: 'flicker' });
    expect(svg).toContain('@keyframes flicker');
  });

  it('matrix animation adds falling effect', () => {
    const svg = textToAnimatedSvg(text, { ...baseOpts, animation: 'matrix' });
    expect(svg).toContain('@keyframes matrix');
  });

  it('sets viewBox and dimensions from text size', () => {
    const svg = textToAnimatedSvg(text, baseOpts);
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('width=');
    expect(svg).toContain('height=');
  });

  it('includes background rect with bgColor', () => {
    const svg = textToAnimatedSvg(text, baseOpts);
    expect(svg).toContain(`fill="${baseOpts.bgColor}"`);
  });
});
