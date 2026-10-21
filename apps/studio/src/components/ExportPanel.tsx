import { useState } from 'react';
import type { EffectResult, EffectType } from '@ditherforge/core';
import { exportPng, exportSvg, exportTxt, copyToClipboard } from '../lib/export.ts';
import { pushStateToUrl } from '../lib/url-state.ts';

interface Props {
  canvas: HTMLCanvasElement | null;
  result: EffectResult | null;
  effectType: EffectType;
  fgColor: string;
  bgColor: string;
  effectConfig: Record<string, unknown>;
  transparentBg: boolean;
}

export default function ExportPanel({
  canvas, result, effectType, fgColor, bgColor, effectConfig, transparentBg,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const isText = result && 'text' in result;

  const handleCopy = async () => {
    if (!canvas) return;
    const ok = await copyToClipboard(canvas);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleShare = () => {
    pushStateToUrl({ effectType, effectConfig, fgColor, bgColor, transparentBg });
    navigator.clipboard.writeText(window.location.href);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Export</h3>
      <div className="grid grid-cols-2 gap-2">
        <button className="px-3 py-2 text-xs bg-neutral-800 rounded hover:bg-neutral-700 transition-colors"
          onClick={() => canvas && exportPng(canvas)} disabled={!canvas}>PNG</button>
        <button className="px-3 py-2 text-xs bg-neutral-800 rounded hover:bg-neutral-700 transition-colors"
          onClick={() => result && exportSvg(result, effectType, fgColor, bgColor)} disabled={!result}>SVG</button>
        {isText && (
          <button className="px-3 py-2 text-xs bg-neutral-800 rounded hover:bg-neutral-700 transition-colors"
            onClick={() => result && exportTxt(result)}>TXT</button>
        )}
        <button className="px-3 py-2 text-xs bg-neutral-800 rounded hover:bg-neutral-700 transition-colors"
          onClick={handleCopy} disabled={!canvas}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <button className="w-full px-3 py-2 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
        onClick={handleShare}>{shared ? 'Link copied!' : 'Share settings (URL)'}</button>
    </div>
  );
}
