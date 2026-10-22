import { useState } from 'react';
import type { EffectResult, SvgAnimation, AnimatedSvgOptions } from '@ditherforge/core';
import { exportAnimatedSvg } from '../lib/export.ts';

interface Props {
  result: EffectResult | null;
  fgColor: string;
  bgColor: string;
}

const ANIMATIONS: { id: SvgAnimation; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'reveal', label: 'Reveal' },
  { id: 'scanline', label: 'Scanline' },
  { id: 'flicker', label: 'Flicker' },
  { id: 'matrix', label: 'Matrix' },
];

const HF_SPACE_URL = 'https://huggingface.co/spaces/wisamWR/maxither-api';

export default function EmbedPanel({ result, fgColor, bgColor }: Props) {
  const [animation, setAnimation] = useState<SvgAnimation>('none');
  const [duration, setDuration] = useState(2);
  const [embedText, setEmbedText] = useState('Maxither');
  const [embedStyle, setEmbedStyle] = useState('ascii');
  const [copied, setCopied] = useState(false);

  const isText = result && 'text' in result;

  const handleExportAnimated = () => {
    if (!result || !isText) return;
    const opts: AnimatedSvgOptions = {
      fontSize: 14, color: fgColor, bgColor, animation, duration,
    };
    exportAnimatedSvg(result, opts);
  };

  const embedUrl = `${HF_SPACE_URL}/api/text?text=${encodeURIComponent(embedText)}&style=${embedStyle}&color=${encodeURIComponent(fgColor.replace('#', ''))}&bg=${encodeURIComponent(bgColor.replace('#', ''))}&animate=${animation}`;

  const embedMarkdown = `[![Maxither](${embedUrl})](https://github.com/wisamWR/Maxither-dither_fx_studio)`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Embed & Animate</h3>

      <label className="block">
        <span className="text-xs text-neutral-400">Animation</span>
        <select value={animation} onChange={(e) => setAnimation(e.target.value as SvgAnimation)}
          className="w-full bg-neutral-800 rounded px-2 py-1 text-sm text-neutral-200 mt-1">
          {ANIMATIONS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </label>

      {animation !== 'none' && (
        <label className="block">
          <span className="text-xs text-neutral-400 flex justify-between">
            Duration <span className="text-neutral-500">{duration}s</span>
          </span>
          <input type="range" min={0.5} max={5} step={0.1} value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-green-400" />
        </label>
      )}

      {isText && (
        <button className="w-full px-3 py-2 text-xs bg-neutral-800 rounded hover:bg-neutral-700 transition-colors"
          onClick={handleExportAnimated}>
          Download Animated SVG
        </button>
      )}

      <div className="border-t border-neutral-800 pt-3 mt-3">
        <p className="text-xs text-neutral-400 mb-2">README Embed (via API)</p>
        <input type="text" value={embedText} onChange={(e) => setEmbedText(e.target.value)}
          placeholder="Banner text"
          className="w-full bg-neutral-800 rounded px-2 py-1 text-sm text-neutral-200 mb-2" />
        <select value={embedStyle} onChange={(e) => setEmbedStyle(e.target.value)}
          className="w-full bg-neutral-800 rounded px-2 py-1 text-sm text-neutral-200 mb-2">
          <option value="binary">Binary</option>
          <option value="ascii">ASCII</option>
          <option value="braille">Braille</option>
        </select>
        <pre className="text-[10px] text-neutral-500 bg-neutral-900 rounded p-2 overflow-x-auto mb-2 break-all whitespace-pre-wrap">
          {embedMarkdown}
        </pre>
        <button className="w-full px-3 py-2 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
          onClick={handleCopyEmbed}>
          {copied ? 'Copied!' : 'Copy Markdown'}
        </button>
      </div>
    </div>
  );
}
