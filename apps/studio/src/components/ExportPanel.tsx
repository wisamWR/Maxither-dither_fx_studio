import { useState } from 'react';
import type { EffectResult, EffectType, AnsiColorMode } from '@ditherforge/core';
import { exportPng, exportSvg, exportTxt, exportAnsi, copyToClipboard } from '../lib/export.ts';
import { pushStateToUrl } from '../lib/url-state.ts';
import AnsiPreview from './AnsiPreview.tsx';

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
  const [ansiMode, setAnsiMode] = useState<AnsiColorMode>('truecolor');
  const [ansiPreview, setAnsiPreview] = useState<string | null>(null);

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

      {isText && (
        <div className="border-t border-neutral-800 pt-3 mt-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-neutral-400">ANSI</span>
            <select value={ansiMode} onChange={(e) => setAnsiMode(e.target.value as AnsiColorMode)}
              className="bg-neutral-800 rounded px-1 py-0.5 text-xs text-neutral-200">
              <option value="truecolor">Truecolor</option>
              <option value="256">256-color</option>
              <option value="16">16-color</option>
            </select>
          </div>
          <button className="w-full px-3 py-2 text-xs bg-neutral-800 rounded hover:bg-neutral-700 transition-colors mb-2"
            onClick={() => {
              if (!result) return;
              const ansi = exportAnsi(result, fgColor, { mode: ansiMode, useBackground: false });
              if (ansi) {
                setAnsiPreview(ansi);
                navigator.clipboard.writeText(ansi);
              }
            }}>
            Copy ANSI to clipboard
          </button>
          {ansiPreview && <AnsiPreview ansiText={ansiPreview} />}
        </div>
      )}
    </div>
  );
}
